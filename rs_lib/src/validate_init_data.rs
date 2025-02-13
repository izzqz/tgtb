use hmac::{Hmac, Mac};
use js_sys::{Function, Error as JsError};
use sha2::Sha256;
use thiserror::Error;
use wasm_bindgen::prelude::*;
use percent_encoding::percent_decode_str;

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

const WEBAPPDATA: &[u8] = b"WebAppData";
const CAPACITY: usize = 32; // Reasonable default for query params

/// Extracts the hash from init data string
fn extract_hash(init_data: &str) -> Result<(String, String), JsError> {
    let (base_data, hash) = if let Some(pos) = init_data.find("&hash=") {
        let (base, hash_part) = init_data.split_at(pos);
        let hash = &hash_part[6..]; // Skip "&hash="
        (base.to_string(), hash.to_string())
    } else {
        return Err(JsError::new("missing hash field"));
    };

    Ok((base_data, hash))
}

#[wasm_bindgen]
pub fn create_validator(bot_token: &str) -> Result<Function, JsError> {
  // Pre-compute the secret key once
  let mut secret = HmacSha256::new_from_slice(WEBAPPDATA)
    .map_err(|e| JsError::new(&e.to_string()))?;
  secret.update(bot_token.as_bytes());
  let secret_key = secret.finalize().into_bytes();
  
  // Create closure that returns bool directly and throws JsError
  let validate_fn = Closure::wrap(Box::new(move |init_data: String| -> bool {
    if init_data.is_empty() {
      wasm_bindgen::throw_val(JsValue::from(JsError::new("empty init data")));
    }

    // Extract hash first
    let (base_data, hash) = match extract_hash(&init_data) {
      Ok(result) => result,
      Err(e) => {
        wasm_bindgen::throw_val(JsValue::from(e));
      }
    };

    // Pre-allocate vector with estimated capacity
    let mut arr = Vec::with_capacity(CAPACITY);
    
    // Process base data and validate query pairs
    for pair in base_data.split('&') {
      if !pair.contains('=') {
        wasm_bindgen::throw_val(JsValue::from(JsError::new("malformed query pair")));
      }

      // URL decode the pair
      let decoded_pair = match percent_decode_str(pair).decode_utf8() {
        Ok(decoded) => decoded.to_string(),
        Err(_) => pair.to_string(),
      };

      arr.push(decoded_pair);
    }

    // Validate hash format after query validation
    if !hash.chars().all(|c| c.is_ascii_hexdigit()) || hash.len() != 64 {
      wasm_bindgen::throw_val(JsValue::from(JsError::new("hash mismatch")));
    }

    // Sort array in-place using faster ascii comparison
    arr.sort_unstable_by(|a, b| {
      a.bytes()
        .map(|b| b.to_ascii_lowercase())
        .cmp(b.bytes().map(|b| b.to_ascii_lowercase()))
    });

    // Join with newlines - pre-calculate capacity
    let total_len = arr.iter().map(|s| s.len()).sum::<usize>() + arr.len() - 1;
    let mut data_check_string = String::with_capacity(total_len);
    
    for (i, s) in arr.iter().enumerate() {
      if i > 0 {
        data_check_string.push('\n');
      }
      data_check_string.push_str(s);
    }

    // Calculate HMAC using the digest from the first HMAC as the key
    let mut mac = match HmacSha256::new_from_slice(&secret_key) {
      Ok(m) => m,
      Err(e) => {
        wasm_bindgen::throw_val(JsValue::from(JsError::new(&e.to_string())));
      }
    };

    mac.update(data_check_string.as_bytes());
    let result = mac.finalize().into_bytes();

    // Use stack allocation for hex encoding
    let mut calculated_hash = [0u8; 64];
    if let Err(e) = hex::encode_to_slice(result, &mut calculated_hash) {
      wasm_bindgen::throw_val(JsValue::from(JsError::new(&e.to_string())));
    }

    let calculated_hash_str = std::str::from_utf8(&calculated_hash[..hash.len()]).unwrap_or("invalid utf8");

    let is_valid = calculated_hash_str == hash;
    if !is_valid {
      wasm_bindgen::throw_val(JsValue::from(JsError::new("hash mismatch")));
    }

    true
  }) as Box<dyn Fn(String) -> bool>);

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
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }

  #[wasm_bindgen_test]
  fn test_invalid_hash() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890&hash=invalid";

    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
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
  fn test_wasm_error() {
    let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    let init_data = "";
    let validate = create_validator(bot_token).unwrap();
    let result = validate.call1(&JsValue::NULL, &JsValue::from_str(init_data));
    assert!(result.is_err());
  }
}
