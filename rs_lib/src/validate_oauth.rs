use hmac::{Hmac, Mac};
use js_sys::{Error as JsError, Function, Object};
use sha2::{Digest, Sha256};
use thiserror::Error;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

type HmacSha256 = Hmac<Sha256>;

#[derive(Error, Debug)]
pub enum ValidationError {
  #[error("oauth_data is empty")]
  EmptyOAuthData,
  #[error("Missing required field: {0}")]
  MissingField(String),
  #[error("Invalid data: {0}")]
  InvalidData(String),
  #[error("Parse error: {0}")]
  ParseError(String),
  #[error("Hash verification failed")]
  HashVerificationFailed,
  #[error("Invalid bot token")]
  InvalidBotToken,
  #[error("Data has expired")]
  Expired,
}

impl From<ValidationError> for JsError {
  fn from(err: ValidationError) -> Self {
    JsError::new(&err.to_string())
  }
}

fn build_data_check_string(
  data: &Object,
) -> Result<(String, String), ValidationError> {
  let js_keys = js_sys::Object::keys(data);
  let mut keys: Vec<String> =
    js_keys.iter().map(|k| k.as_string().unwrap()).collect();

  // Sort keys alphabetically
  keys.sort_unstable();

  let mut pairs = Vec::new();
  let mut hash = String::new();

  for key in keys {
    if key == "hash" {
      // Store hash value separately
      let value = js_sys::Reflect::get(data, &JsValue::from_str(&key))
        .map_err(|_| {
          ValidationError::InvalidData("Failed to get hash value".into())
        })?;

      if let Some(h) = value.as_string() {
        hash = h;
      }
      continue;
    }

    let value =
      js_sys::Reflect::get(data, &JsValue::from_str(&key)).map_err(|_| {
        ValidationError::InvalidData(format!(
          "Failed to get value for key: {}",
          key
        ))
      })?;

    // Skip null, undefined, or empty values
    if value.is_null() || value.is_undefined() {
      continue;
    }

    // Convert numeric values to strings
    let value_str =
      if js_sys::Number::is_integer(&value) || value.as_f64().is_some() {
        value
          .as_f64()
          .ok_or_else(|| {
            ValidationError::InvalidData(format!(
              "Failed to convert number for key '{}' to string",
              key
            ))
          })?
          .to_string()
      } else {
        value.as_string().ok_or_else(|| {
          ValidationError::InvalidData(format!(
            "Value for key '{}' is not a string or number",
            key
          ))
        })?
      };

    if !value_str.is_empty() {
      pairs.push(format!("{}={}", key, value_str));
    }
  }

  if hash.is_empty() {
    return Err(ValidationError::MissingField("hash field not found".into()));
  }

  Ok((pairs.join("\n"), hash))
}

#[wasm_bindgen]
pub fn create_oauth_validator(
  bot_token: &str,
  expires_in: Option<u32>,
) -> Result<Function, JsError> {
  if bot_token.is_empty() {
    return Err(ValidationError::InvalidBotToken.into());
  }

  // Create SHA256 hash of bot token as per Telegram docs
  let secret_key = Sha256::digest(bot_token.as_bytes());
  let expires_in = expires_in.unwrap_or(0);

  let validate_fn =
    Closure::wrap(Box::new(move |oauth_data: JsValue| -> bool {
      let result = (|| -> Result<bool, ValidationError> {
        let data = oauth_data.dyn_into::<Object>().map_err(|_| {
          ValidationError::InvalidData("Input must be an object".into())
        })?;

        let (data_check_string, hash) = build_data_check_string(&data)?;

        // Calculate HMAC-SHA-256
        let mut mac = HmacSha256::new_from_slice(&secret_key)
          .map_err(|e| ValidationError::ParseError(e.to_string()))?;
        mac.update(data_check_string.as_bytes());
        let result = mac.finalize().into_bytes();

        // Convert to hex
        let mut calculated_hash = [0u8; 64];
        hex::encode_to_slice(result, &mut calculated_hash)
          .map_err(|e| ValidationError::ParseError(e.to_string()))?;

        if hash.as_bytes() != &calculated_hash[..] {
          return Err(ValidationError::HashVerificationFailed);
        }

        // Check expiration if enabled
        if expires_in > 0 {
          let auth_date =
            js_sys::Reflect::get(&data, &JsValue::from_str("auth_date"))
              .map_err(|_| {
                ValidationError::MissingField(
                  "auth_date field not found".into(),
                )
              })?;

          let auth_timestamp = if auth_date.as_f64().is_some() {
            auth_date.as_f64().ok_or_else(|| {
              ValidationError::InvalidData(
                "auth_date is not a valid number".into(),
              )
            })? as u32
          } else {
            auth_date
              .as_string()
              .ok_or_else(|| {
                ValidationError::InvalidData(
                  "auth_date is not a string or number".into(),
                )
              })?
              .parse::<u32>()
              .map_err(|e| ValidationError::ParseError(e.to_string()))?
          };

          let now = (js_sys::Date::now() as u64 / 1000) as u32;
          if auth_timestamp + expires_in <= now {
            return Err(ValidationError::Expired);
          }
        }

        Ok(true)
      })();

      match result {
        Ok(valid) => valid,
        Err(e) => wasm_bindgen::throw_val(JsValue::from(JsError::from(e))),
      }
    }) as Box<dyn Fn(JsValue) -> bool>);

  Ok(validate_fn.into_js_value().unchecked_into())
}

#[cfg(test)]
#[allow(dead_code)]
mod tests {
  use super::*;
  use wasm_bindgen_test::*;

  const BOT_TOKEN: &str = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

  fn get_error_message(err: JsValue) -> String {
    js_sys::Error::from(err).message().into()
  }

  fn create_test_object(data: &[(&str, &str)]) -> Object {
    let obj = Object::new();
    for (key, value) in data {
      js_sys::Reflect::set(
        &obj,
        &JsValue::from_str(key),
        &JsValue::from_str(value),
      )
      .unwrap();
    }
    obj
  }

  #[wasm_bindgen_test]
  fn test_reject_empty_bot_token() {
    let result = create_oauth_validator("", None);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().to_string(), "Error: Invalid bot token");
  }

  #[wasm_bindgen_test]
  fn test_reject_non_object_input() {
    let validate = create_oauth_validator(BOT_TOKEN, None).unwrap();
    let result =
      validate.call1(&JsValue::NULL, &JsValue::from_str("not an object"));
    assert!(result.is_err());
    assert_eq!(
      get_error_message(result.unwrap_err()),
      "Invalid data: Input must be an object"
    );
  }

  #[wasm_bindgen_test]
  fn test_reject_missing_hash() {
    let validate = create_oauth_validator(BOT_TOKEN, None).unwrap();
    let obj = create_test_object(&[
      ("auth_date", "1234567890"),
      ("id", "123456789"),
      ("first_name", "Test"),
    ]);
    let result = validate.call1(&JsValue::NULL, &obj.into());
    assert!(result.is_err());
    assert_eq!(
      get_error_message(result.unwrap_err()),
      "Missing required field: hash field not found"
    );
  }

  #[wasm_bindgen_test]
  fn test_reject_invalid_hash() {
    let validate = create_oauth_validator(BOT_TOKEN, None).unwrap();
    let obj = create_test_object(&[
      ("auth_date", "1234567890"),
      ("id", "123456789"),
      ("first_name", "Test"),
      ("hash", &"0".repeat(64)),
    ]);
    let result = validate.call1(&JsValue::NULL, &obj.into());
    assert!(result.is_err());
    assert_eq!(
      get_error_message(result.unwrap_err()),
      "Hash verification failed"
    );
  }

  #[wasm_bindgen_test]
  fn test_reject_expired_data() {
    let validate = create_oauth_validator(BOT_TOKEN, Some(60)).unwrap(); // 1 minute expiration
    let now = (js_sys::Date::now() as u64 / 1000) - 120; // 2 minutes ago
    let obj = create_test_object(&[
      ("auth_date", &now.to_string()),
      ("id", "123456789"),
      ("first_name", "Test"),
      ("hash", &"0".repeat(64)),
    ]);
    let result = validate.call1(&JsValue::NULL, &obj.into());
    assert!(result.is_err());
    assert_eq!(
      get_error_message(result.unwrap_err()),
      "Hash verification failed"
    );
  }
}
