use hmac::{Hmac, Mac};
use sha2::Sha256;
use thiserror::Error;
use url::Url;
use wasm_bindgen::prelude::*;

type HmacSha256 = Hmac<Sha256>;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Missing required field: {0}")]
    MissingField(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    #[error("Parse error: {0}")]
    ParseError(String),
}

fn validate_init_data_internal(init_data: &str, bot_token: &str) -> Result<bool, ValidationError> {
    let parsed_url = Url::parse(&format!("https://example.com/?{}", init_data))
        .map_err(|e| ValidationError::InvalidUrl(e.to_string()))?;

    let query_pairs: Vec<(String, String)> = parsed_url
        .query_pairs()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect();

    // Extract hash
    let hash = query_pairs
        .iter()
        .find(|(k, _)| k == "hash")
        .ok_or_else(|| ValidationError::MissingField("hash".to_string()))?
        .1
        .clone();

    // Create data check string
    let mut check_pairs: Vec<(String, String)> = query_pairs
        .into_iter()
        .filter(|(k, _)| k != "hash")
        .collect();
    check_pairs.sort_by(|a, b| a.0.cmp(&b.0));

    let data_check_string = check_pairs
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<String>>()
        .join("\n");

    // Generate secret key
    let mut secret_key = HmacSha256::new_from_slice(bot_token.as_bytes())
        .map_err(|e| ValidationError::ParseError(e.to_string()))?;
    secret_key.update(b"WebAppData");
    let secret_key = secret_key.finalize().into_bytes();

    // Calculate HMAC
    let mut mac = HmacSha256::new_from_slice(&secret_key)
        .map_err(|e| ValidationError::ParseError(e.to_string()))?;
    mac.update(data_check_string.as_bytes());
    let result = mac.finalize().into_bytes();
    let calculated_hash = hex::encode(result);

    Ok(calculated_hash == hash)
}

#[wasm_bindgen]
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
