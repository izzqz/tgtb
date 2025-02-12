use hmac::{Hmac, Mac};
use sha2::Sha256;
use thiserror::Error;
use wasm_bindgen::prelude::*;
use core::hint::black_box;
use hex;

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

#[inline(always)]
fn validate_init_data_internal(init_data: &str, bot_token: &str) -> Result<bool, ValidationError> {
    if init_data.is_empty() {
        return Err(ValidationError::InvalidQueryString("empty init data".into()));
    }

    if !init_data.contains('=') || !init_data.contains("hash=") {
        return Err(ValidationError::MissingField("hash".into()));
    }

    let mut check_pairs = Vec::with_capacity(8);
    let mut hash = None;

    for pair in init_data.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == "hash" {
                hash = Some(v.to_string());
                continue;
            }
            check_pairs.push((k.to_string(), v.to_string()));
        } else {
            return Err(ValidationError::InvalidQueryString("malformed query pair".into()));
        }
    }

    let hash = match hash {
        Some(h) => h,
        None => return Err(ValidationError::MissingField("hash".into())),
    };
    
    check_pairs.sort_unstable_by(|a, b| a.0.cmp(&b.0));

    let total_len: usize = check_pairs.iter()
        .map(|(k, v)| k.len() + v.len() + 2)
        .sum();
    let mut data_check_string = String::with_capacity(total_len);

    for (i, (k, v)) in check_pairs.iter().enumerate() {
        if i > 0 {
            data_check_string.push('\n');
        }
        data_check_string.push_str(k);
        data_check_string.push('=');
        data_check_string.push_str(v);
    }

    // Generate secret key
    let mut secret_key = match HmacSha256::new_from_slice(bot_token.as_bytes()) {
        Ok(key) => key,
        Err(e) => return Err(ValidationError::ParseError(e.to_string())),
    };
    secret_key.update(black_box(b"WebAppData"));
    let secret_key = secret_key.finalize().into_bytes();

    // Calculate HMAC
    let mut mac = match HmacSha256::new_from_slice(&secret_key) {
        Ok(mac) => mac,
        Err(e) => return Err(ValidationError::ParseError(e.to_string())),
    };
    mac.update(data_check_string.as_bytes());
    
    let result = mac.finalize().into_bytes();
    
    // Use stack allocation for hex encoding
    let mut calculated_hash = [0u8; 64];
    if let Err(e) = hex::encode_to_slice(&result, &mut calculated_hash) {
        return Err(ValidationError::ParseError(e.to_string()));
    }

    Ok(hash.as_bytes() == &calculated_hash[..hash.len()])
}

#[wasm_bindgen]
#[inline]
pub fn validate_init_data(init_data: &str, bot_token: &str) -> Result<bool, JsError> {
    validate_init_data_internal(init_data, bot_token).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_init_data() {
        let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
        let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1234567890&hash=c0d3e6c3ca85c0d3c7e6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7";

        let result = validate_init_data_internal(init_data, bot_token);
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_hash() {
        let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
        let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890&hash=invalid";

        let result = validate_init_data_internal(init_data, bot_token);
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_missing_hash() {
        let bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
        let init_data = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890";

        let result = validate_init_data_internal(init_data, bot_token);
        assert!(result.is_err());
    }
}
