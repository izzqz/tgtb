use hmac::{Hmac, Mac};
use js_sys::{Function, Error as JsError};
use sha2::Sha256;
use thiserror::Error;
use wasm_bindgen::prelude::*;
use web_sys::console;

type HmacSha256 = Hmac<Sha256>;

#[derive(Error, Debug)]
pub enum ValidationError {
  #[error("Missing required field: {0}")]
  MissingField(String),
  #[error("Invalid query string: {0}")]
  InvalidQueryString(String),
  #[error("Parse error: {0}")]
  ParseError(String),
}

#[wasm_bindgen]
pub fn create_validator(bot_token: &str) -> Result<Function, JsError> {
  // First create HMAC with WebAppData as key and bot token as data
  let mut secret = HmacSha256::new_from_slice(b"WebAppData")
    .map_err(|e| JsError::new(&e.to_string()))?;
  secret.update(bot_token.as_bytes());
  // Get the secret key from the first HMAC's digest
  let secret_key = secret.finalize().into_bytes().to_vec();
  let bot_token = bot_token.to_string();

  // Create closure that returns bool directly
  let validate_fn = Closure::wrap(Box::new(move |init_data: String| -> Result<bool, JsError> {
    let secret_key = secret_key.clone();

    if init_data.is_empty() {
      return Err(JsError::new("empty init data"));
    }

    // Decode URI components
    let decoded = match js_sys::decode_uri_component(&init_data) {
      Ok(val) => val.as_string().unwrap_or_else(|| init_data.clone()),
      Err(_) => init_data.clone(),
    };

    // Split into array and find hash
    let mut arr: Vec<String> = decoded.split('&').map(String::from).collect();
    
    // Check for hash field first
    if !arr.iter().any(|s| s.starts_with("hash=")) {
      return Err(JsError::new("missing hash field"));
    }

    // Then validate all pairs have = sign
    if arr.iter().any(|s| !s.contains('=')) {
      return Err(JsError::new("malformed query pair"));
    }

    let hash = match arr.iter().position(|s| s.starts_with("hash=")) {
      Some(idx) => {
        let hash_pair = arr.remove(idx);
        hash_pair.split('=').nth(1).unwrap_or("").to_string()
      }
      None => {
        return Err(JsError::new("missing hash field"));
      }
    };

    // Sort array alphabetically
    arr.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));

    // Join with newlines
    let data_check_string = arr.join("\n");

    console::log_1(&JsValue::from_str(&format!(
      "Bot token length: {}\nSecret key (hex): {}\nData check string:\n{}",
      bot_token.len(),
      hex::encode(&secret_key),
      data_check_string
    )));

    // Calculate HMAC using the digest from the first HMAC as the key
    let mut mac = match HmacSha256::new_from_slice(&secret_key) {
      Ok(m) => m,
      Err(e) => {
        return Err(JsError::new(&e.to_string()));
      }
    };

    mac.update(data_check_string.as_bytes());
    let result = mac.finalize().into_bytes();

    // Use stack allocation for hex encoding
    let mut calculated_hash = [0u8; 64];
    if let Err(e) = hex::encode_to_slice(result, &mut calculated_hash) {
      return Err(JsError::new(&e.to_string()));
    }

    let calculated_hash_str = std::str::from_utf8(&calculated_hash[..hash.len()]).unwrap_or("invalid utf8");

    console::log_1(&JsValue::from_str(&format!(
      "Calculated hash: {}\nExpected hash: {}",
      calculated_hash_str,
      hash
    )));

    Ok(calculated_hash_str == hash)
  }) as Box<dyn Fn(String) -> Result<bool, JsError>>);

  Ok(validate_fn.into_js_value().unchecked_into())
}

#[cfg(test)]
mod tests {
  use super::*;
  use wasm_bindgen_test::*;

  const VALID_BOT_TOKEN: &str = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
  const VALID_INIT_DATA: &str = "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";

  #[wasm_bindgen_test]
  fn test_real_world_valid_init_data() {
    let validate = create_validator(VALID_BOT_TOKEN).unwrap();
    let result = validate
      .call1(&JsValue::NULL, &JsValue::from_str(VALID_INIT_DATA))
      .unwrap();
    assert!(result.as_bool().unwrap());
  }

  #[wasm_bindgen_test]
  fn test_valid_init_data() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "auth_date=1234567890&query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&hash=c0d3e6c3ca85c0d3c7e6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7";

    let validate = create_validator(bot_token).unwrap();
    let result = validate
      .call1(&JsValue::NULL, &JsValue::from_str(init_data))
      .unwrap();
    assert!(!result.as_bool().unwrap()); // Since we don't have a real hash
  }

  #[wasm_bindgen_test]
  fn test_invalid_hash() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890&hash=invalid";

    let validate = create_validator(bot_token).unwrap();
    let result = validate
      .call1(&JsValue::NULL, &JsValue::from_str(init_data))
      .unwrap();
    assert!(!result.as_bool().unwrap());
  }

  #[wasm_bindgen_test]
  fn test_missing_hash() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890";

    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_empty_init_data() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(""));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_malformed_query_pair() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "query_id&user=test&hash=abc";
    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_no_equals_in_query() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "queryidtest";

    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_wasm_valid() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "query_id=test&hash=test";
    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_ok());
  }

  #[wasm_bindgen_test]
  fn test_wasm_error() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "";
    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }
}
