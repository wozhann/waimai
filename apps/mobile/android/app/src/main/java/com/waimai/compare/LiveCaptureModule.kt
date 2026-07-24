package com.waimai.compare

import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

/**
 * JS-facing bridge for the capture feature. Captures are passed as JSON strings
 * (parsed on the JS side) to avoid hand-mapping into WritableMap.
 */
class LiveCaptureModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  init {
    instance = this
  }

  override fun getName() = "WaimaiLiveCapture"

  @ReactMethod
  fun getCaptures(promise: Promise) {
    try {
      promise.resolve(CaptureStore.all(reactContext).toString())
    } catch (e: Exception) {
      promise.reject("ERR_READ", e)
    }
  }

  @ReactMethod
  fun clearCaptures(promise: Promise) {
    try {
      CaptureStore.clear(reactContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR_CLEAR", e)
    }
  }

  @ReactMethod
  fun isServiceEnabled(promise: Promise) {
    promise.resolve(isAccessibilityEnabled())
  }

  @ReactMethod
  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  /**
   * Launch a delivery app by package. Tries each candidate in order (e.g. the
   * dedicated 美团外卖 app, then the main 美团 app) and opens the first one that
   * is installed. Resolves the launched package id, or null if none are present.
   * Only opens the app to its own entry point — no deep link into another app.
   */
  @ReactMethod
  fun openApp(packages: ReadableArray, promise: Promise) {
    val pm = reactContext.packageManager
    for (i in 0 until packages.size()) {
      val pkg = packages.getString(i) ?: continue
      val intent = pm.getLaunchIntentForPackage(pkg) ?: continue
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(pkg)
      return
    }
    promise.resolve(null)
  }

  // Required so NativeEventEmitter on the JS side does not warn.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Int) {}

  private fun isAccessibilityEnabled(): Boolean {
    val expected = "${reactContext.packageName}/${WaimaiCaptureService::class.java.name}"
    val enabled =
        Settings.Secure.getString(
            reactContext.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            ?: return false
    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    while (splitter.hasNext()) {
      if (splitter.next().equals(expected, ignoreCase = true)) return true
    }
    return false
  }

  companion object {
    private var instance: LiveCaptureModule? = null

    /** Called from the AccessibilityService when a new snapshot is recorded. */
    fun emitCapture(record: JSONObject) {
      val ctx = instance?.reactContext ?: return
      if (!ctx.hasActiveReactInstance()) return
      ctx
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("waimaiCapture", record.toString())
    }
  }
}
