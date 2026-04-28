use napi::bindgen_prelude::{Error, Result};
use napi_derive::napi;

#[napi]
pub struct ClientHandle;

#[napi(object)]
pub struct PolicyResult {
  pub denied: Option<bool>,
  pub pending: Option<bool>,
  pub reason: Option<String>,
}

#[napi]
pub async fn connect(_socket_path: String) -> Result<ClientHandle> {
  Ok(ClientHandle)
}

#[napi]
pub fn send_event(_handle: &ClientHandle, _event: serde_json::Value) -> Result<()> {
  Ok(())
}

#[napi]
pub async fn query_policy(
  _handle: &ClientHandle,
  _action: serde_json::Value,
) -> Result<PolicyResult> {
  Ok(PolicyResult {
    denied: Some(false),
    pending: Some(false),
    reason: None,
  })
}

#[napi]
pub async fn disconnect(_handle: &ClientHandle) -> Result<()> {
  Ok(())
}

fn _typed_error(code: &str, message: &str) -> Error {
  Error::from_reason(format!("{code}:{message}"))
}
