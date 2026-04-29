use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use napi::bindgen_prelude::{Error, Function, Result};
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use serde_json::Value;
use tokio::sync::mpsc;

const ERR_CONNECT: &str = "AA_ERR_CONNECT";
const ERR_SEND_EVENT: &str = "AA_ERR_SEND_EVENT";
const ERR_QUERY_POLICY: &str = "AA_ERR_QUERY_POLICY";
const ERR_DISCONNECT: &str = "AA_ERR_DISCONNECT";
const ERR_SET_EVENT_LISTENER: &str = "AA_ERR_SET_EVENT_LISTENER";

type EventSink = ThreadsafeFunction<String, (), String, napi::Status, false, false, 0>;

struct ClientState {
  socket_path: String,
  closed: AtomicBool,
  event_tx: std::sync::Mutex<Option<mpsc::UnboundedSender<Value>>>,
  event_loop: std::sync::Mutex<Option<tokio::task::JoinHandle<()>>>,
  event_sink: std::sync::Mutex<Option<EventSink>>,
}

#[napi]
pub struct ClientHandle {
  inner: Arc<ClientState>,
}

#[napi(object)]
pub struct PolicyResult {
  pub denied: Option<bool>,
  pub pending: Option<bool>,
  pub reason: Option<String>,
}

#[napi]
pub async fn connect(socket_path: String) -> Result<ClientHandle> {
  if socket_path.trim().is_empty() {
    return Err(typed_error(ERR_CONNECT, "socketPath cannot be empty"));
  }

  let (event_tx, mut event_rx) = mpsc::unbounded_channel::<Value>();

  let state = Arc::new(ClientState {
    socket_path,
    closed: AtomicBool::new(false),
    event_tx: std::sync::Mutex::new(Some(event_tx)),
    event_loop: std::sync::Mutex::new(None),
    event_sink: std::sync::Mutex::new(None),
  });

  let state_for_loop = Arc::clone(&state);

  // Simulate an always-on IPC pump. The task yields each iteration so JS stays non-blocking.
  let loop_handle = tokio::spawn(async move {
    while let Some(event) = event_rx.recv().await {
      if let Ok(payload) = serde_json::to_string(&event) {
        if let Ok(guard) = state_for_loop.event_sink.lock() {
          if let Some(sink) = guard.as_ref() {
            let _ = sink.call(payload, ThreadsafeFunctionCallMode::NonBlocking);
          }
        }
      }
      tokio::task::yield_now().await;
    }
  });

  if let Ok(mut guard) = state.event_loop.lock() {
    *guard = Some(loop_handle);
  }

  Ok(ClientHandle { inner: state })
}

#[napi]
pub fn send_event(handle: &ClientHandle, event: Value) -> Result<()> {
  if handle.inner.closed.load(Ordering::Relaxed) {
    return Err(typed_error(
      ERR_SEND_EVENT,
      "client is disconnected; sendEvent is unavailable",
    ));
  }

  let send_result = handle
    .inner
    .event_tx
    .lock()
    .map_err(|_| typed_error(ERR_SEND_EVENT, "event queue lock poisoned"))?
    .as_ref()
    .ok_or_else(|| typed_error(ERR_SEND_EVENT, "event queue has been closed"))?
    .send(event);

  send_result.map_err(|_| typed_error(ERR_SEND_EVENT, "failed to enqueue event"))
}

#[napi]
pub async fn query_policy(handle: &ClientHandle, action: Value) -> Result<PolicyResult> {
  if handle.inner.closed.load(Ordering::Relaxed) {
    return Err(typed_error(
      ERR_QUERY_POLICY,
      "client is disconnected; queryPolicy is unavailable",
    ));
  }

  let denied = action
    .get("denied")
    .and_then(Value::as_bool)
    .or_else(|| action.get("deny").and_then(Value::as_bool));

  let pending = action.get("pending").and_then(Value::as_bool);
  let reason = action
    .get("reason")
    .and_then(Value::as_str)
    .map(ToOwned::to_owned);

  Ok(PolicyResult {
    denied: Some(denied.unwrap_or(false)),
    pending: Some(pending.unwrap_or(false)),
    reason,
  })
}

#[napi]
pub async fn disconnect(handle: &ClientHandle) -> Result<()> {
  if handle.inner.closed.swap(true, Ordering::Relaxed) {
    return Ok(());
  }

  handle
    .inner
    .event_tx
    .lock()
    .map_err(|_| typed_error(ERR_DISCONNECT, "event queue lock poisoned"))?
    .take();

  let event_loop = handle
    .inner
    .event_loop
    .lock()
    .map_err(|_| typed_error(ERR_DISCONNECT, "event loop lock poisoned"))?
    .take();

  if let Some(event_loop) = event_loop {
    event_loop
      .await
      .map_err(|err| typed_error(ERR_DISCONNECT, &format!("event loop join error: {err}")))?;
  }

  Ok(())
}

#[napi]
pub fn set_event_listener(handle: &ClientHandle, callback: Function<'_, String, ()>) -> Result<()> {
  let sink = callback
    .build_threadsafe_function::<String>()
    .build()
    .map_err(|err| typed_error(ERR_SET_EVENT_LISTENER, &err.to_string()))?;

  let mut guard = handle
    .inner
    .event_sink
    .lock()
    .map_err(|_| typed_error(ERR_SET_EVENT_LISTENER, "event sink lock poisoned"))?;
  *guard = Some(sink);

  Ok(())
}

#[napi]
pub fn socket_path(handle: &ClientHandle) -> Result<String> {
  Ok(handle.inner.socket_path.clone())
}

fn typed_error(code: &str, message: &str) -> Error {
  Error::from_reason(format!("{code}:{message}"))
}
