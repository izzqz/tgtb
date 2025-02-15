use hmac::{Hmac, Mac};
use js_sys::{Error as JsError, Function};
use percent_encoding::percent_decode_str;
use sha2::Sha256;
use std::borrow::Cow;
use thiserror::Error;
use wasm_bindgen::prelude::*;

type HmacSha256 = Hmac<Sha256>;

#[derive(Error, Debug)]
pub enum ValidationError {
  #[error("init_data is empty")]
  EmptyInitData,
  #[error("Missing required field: {0}")]
  MissingField(String),
  #[error("Invalid query string: {0}")]
  InvalidQueryString(String),
  #[error("Parse error: {0}")]
  ParseError(String),
  #[error("Invalid hash format: {0}")]
  InvalidHashFormat(String),
  #[error("Hash verification failed")]
  HashVerificationFailed,
  #[error("Invalid bot token")]
  InvalidBotToken,
}

impl From<ValidationError> for JsError {
  fn from(err: ValidationError) -> Self {
    JsError::new(&err.to_string())
  }
}

const WEBAPPDATA: &[u8] = b"WebAppData";
const CAPACITY: usize = 32;

fn extract_hash(init_data: &str) -> Result<(&str, &str), ValidationError> {
  if init_data.is_empty() {
    return Err(ValidationError::EmptyInitData);
  }

  let (base_data, hash) = init_data.split_once("&hash=").ok_or_else(|| {
    ValidationError::MissingField("hash field not found".into())
  })?;

  if hash.is_empty() {
    return Err(ValidationError::InvalidHashFormat("hash is empty".into()));
  }

  if !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
    return Err(ValidationError::InvalidHashFormat(
      "hash contains non-hex characters".into(),
    ));
  }

  if hash.len() != 64 {
    return Err(ValidationError::InvalidHashFormat(format!(
      "hash length is {}, expected 64",
      hash.len()
    )));
  }

  if hash.contains('&') {
    return Err(ValidationError::InvalidHashFormat(
      "hash contains non-hex characters".into(),
    ));
  }

  Ok((base_data, hash))
}

#[wasm_bindgen]
pub fn create_validator(bot_token: &str) -> Result<Function, JsError> {
  if bot_token.is_empty() {
    return Err(ValidationError::InvalidBotToken.into());
  }

  let mut secret = HmacSha256::new_from_slice(WEBAPPDATA)
    .map_err(|e| ValidationError::ParseError(e.to_string()))?;
  secret.update(bot_token.as_bytes());
  let secret_key: [u8; 32] = secret.finalize().into_bytes().into();

  let validate_fn = Closure::wrap(Box::new(move |init_data: String| -> bool {
    let result = (|| -> Result<bool, ValidationError> {
      let (base_data, hash) = extract_hash(&init_data)?;

      let mut pairs = Vec::with_capacity(CAPACITY);
      for pair in base_data.split('&') {
        if !pair.contains('=') {
          return Err(ValidationError::InvalidQueryString(
            "malformed query pair".into(),
          ));
        }

        let decoded_pair = if pair.contains('%') {
          Cow::Owned(
            percent_decode_str(pair)
              .decode_utf8()
              .map_err(|e| ValidationError::ParseError(e.to_string()))?
              .into_owned(),
          )
        } else {
          Cow::Borrowed(pair)
        };
        pairs.push(decoded_pair);
      }

      let mut keyed_pairs = Vec::with_capacity(pairs.len());
      for decoded_pair in pairs {
        let (key, _) = decoded_pair.split_once('=').ok_or_else(|| {
          ValidationError::InvalidQueryString("malformed query pair".into())
        })?;
        let lowercase_key = key.to_ascii_lowercase();
        keyed_pairs.push((lowercase_key, decoded_pair));
      }

      keyed_pairs.sort_unstable_by(|a, b| a.0.cmp(&b.0));

      let mut mac = HmacSha256::new_from_slice(&secret_key)
        .map_err(|e| ValidationError::ParseError(e.to_string()))?;

      let mut first = true;
      for (_, pair) in keyed_pairs {
        if !first {
          mac.update(b"\n");
        } else {
          first = false;
        }
        mac.update(pair.as_bytes());
      }

      let result = mac.finalize().into_bytes();
      let mut calculated_hash = [0u8; 64];
      hex::encode_to_slice(result, &mut calculated_hash)
        .map_err(|e| ValidationError::ParseError(e.to_string()))?;

      if hash.as_bytes() != &calculated_hash[..] {
        return Err(ValidationError::HashVerificationFailed);
      }

      Ok(true)
    })();

    match result {
      Ok(valid) => valid,
      Err(e) => wasm_bindgen::throw_val(JsValue::from(JsError::from(e))),
    }
  }) as Box<dyn Fn(String) -> bool>);

  Ok(validate_fn.into_js_value().unchecked_into())
}

#[cfg(test)]
#[allow(dead_code)]
mod tests {
  use super::*;
  use wasm_bindgen_test::*;

  const VALID_BOT_TOKEN: &str = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
  const BOT_TOKEN: &str = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
  const VALID_INIT_DATA: &str = "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";

  fn get_error_message(err: JsValue) -> String {
    js_sys::Error::from(err).message().into()
  }

  #[wasm_bindgen_test]
  fn test_real_world_valid_init_data() {
    let validate = create_validator(VALID_BOT_TOKEN).unwrap();
    let result = validate
      .call1(&JsValue::NULL, &JsValue::from_str(VALID_INIT_DATA))
      .unwrap();
    assert!(result.as_bool().unwrap());
  }

  #[wasm_bindgen_test]
  fn test_reject_empty_bot_token() {
    let result = create_validator("");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().to_string(), "Error: Invalid bot token");
  }

  #[wasm_bindgen_test]
  fn test_reject_empty_init_data() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(""));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "init_data is empty");
  }

  #[wasm_bindgen_test]
  fn test_reject_missing_hash_field() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890";
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Missing required field: hash field not found");
  }

  #[wasm_bindgen_test]
  fn test_reject_empty_hash() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = "query_id=test&hash=";
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Invalid hash format: hash is empty");
  }

  #[wasm_bindgen_test]
  fn test_reject_non_hex_hash_characters() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = "query_id=test&hash=xyz123";
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Invalid hash format: hash contains non-hex characters");
  }

  #[wasm_bindgen_test]
  fn test_reject_incorrect_hash_length() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = "query_id=test&hash=abc123";
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Invalid hash format: hash length is 6, expected 64");
  }

  #[wasm_bindgen_test]
  fn test_reject_malformed_query_pair() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("query_id&user=test&hash={}", "a".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Invalid query string: malformed query pair");
  }

  #[wasm_bindgen_test]
  fn test_reject_invalid_url_encoding() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("query_id=test&user=%invalid%&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_reject_hash_verification_failure() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("query_id=test&user=test&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_handle_large_input_data() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let large_user = format!(
      "{{\"id\":123456789,\"first_name\":\"{}\",\"last_name\":\"{}\",\"username\":\"{}\"}}",
      "A".repeat(1000),
      "B".repeat(1000),
      "C".repeat(100)
    );
    let init_data = format!(
      "query_id=test&user={}&hash={}",
      js_sys::encode_uri_component(&large_user),
      "0".repeat(64)
    );
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_reject_hash_as_first_parameter() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("hash={}&auth_date=123", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Missing required field: hash field not found");
  }

  #[wasm_bindgen_test]
  fn test_reject_parameters_after_hash() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("auth_date=123&hash={}&foo=bar", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Invalid hash format: hash contains non-hex characters");
  }

  #[wasm_bindgen_test]
  fn test_handle_case_insensitive_key_sorting() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("B=2&a=1&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_handle_encoded_special_characters() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("key%3D=value%26&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_handle_empty_key_or_value() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("=value&key=&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_handle_multiple_equals_in_pair() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("key=val=ue&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }

  #[wasm_bindgen_test]
  fn test_reject_multiple_hash_parameters() {
    let validate = create_validator(BOT_TOKEN).unwrap();
    let init_data = format!("hash=invalid&hash={}", "0".repeat(64));
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(&init_data));
    assert!(result.is_err());
    assert_eq!(get_error_message(result.unwrap_err()), "Hash verification failed");
  }
}
