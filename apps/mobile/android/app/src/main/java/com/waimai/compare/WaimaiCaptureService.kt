package com.waimai.compare

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONArray
import org.json.JSONObject

/**
 * Reads the CURRENTLY VISIBLE checkout screen of the food-delivery apps the user
 * is using and records the price breakdown. The user logs in, claims coupons and
 * builds the cart themselves; this service only reads what is already on screen.
 * There is no network traffic and no interaction with the other apps.
 *
 * Which apps it watches is pinned by `android:packageNames` in
 * res/xml/accessibility_service_config.xml — keep that list and TARGET_PACKAGES
 * in sync when calibrating on a real device.
 */
class WaimaiCaptureService : AccessibilityService() {

  companion object {
    // Package id -> display label. Extend/fix during on-device calibration; the
    // real 美团外卖 / 淘宝闪购 package ids must be confirmed against the device.
    val TARGET_PACKAGES =
        mapOf(
            "com.sankuai.meituan.takeoutnew" to "美团外卖",
            "com.sankuai.meituan" to "美团",
            "me.ele" to "饿了么",
            "com.taobao.taobao" to "淘宝闪购",
            "com.jingdong.app.mall" to "京东")

    // Only snapshot when the screen looks like a confirm-order / payment page,
    // so we never record ordinary browsing.
    private val CHECKOUT_HINTS =
        listOf("提交订单", "去支付", "确认下单", "立即支付", "需支付", "实付", "合计")

    private const val MIN_INTERVAL_MS = 1500L
  }

  private var lastCaptureAt = 0L
  private var lastSignature = ""

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    val pkg = event.packageName?.toString() ?: return
    val label = TARGET_PACKAGES[pkg] ?: return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
        event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED)
        return

    val root = rootInActiveWindow ?: return
    val texts = ArrayList<JSONObject>()
    collectTexts(root, texts)
    if (texts.isEmpty()) return

    val joined = texts.joinToString(" ") { it.optString("text") }
    if (CHECKOUT_HINTS.none { joined.contains(it) }) return

    val now = System.currentTimeMillis()
    val signature = joined.hashCode().toString()
    // Debounce: window content fires rapidly; skip identical back-to-back frames.
    if (now - lastCaptureAt < MIN_INTERVAL_MS && signature == lastSignature) return
    lastCaptureAt = now
    lastSignature = signature

    val record =
        JSONObject().apply {
          put("id", "$pkg-$now")
          put("packageName", pkg)
          put("appLabel", label)
          put("capturedAt", now)
          put("texts", JSONArray(texts as Collection<*>))
          put("parsed", AmountParser.parse(texts))
        }
    CaptureStore.add(applicationContext, record)
    LiveCaptureModule.emitCapture(record)
  }

  override fun onInterrupt() {}

  private fun collectTexts(node: AccessibilityNodeInfo?, out: ArrayList<JSONObject>) {
    node ?: return
    val text = node.text?.toString()?.trim()
    val desc = node.contentDescription?.toString()?.trim()
    val value =
        when {
          !text.isNullOrEmpty() -> text
          !desc.isNullOrEmpty() -> desc
          else -> null
        }
    if (value != null) {
      val rect = Rect()
      node.getBoundsInScreen(rect)
      out.add(
          JSONObject().apply {
            put("text", value)
            put("top", rect.top)
            put("left", rect.left)
            node.viewIdResourceName?.let { put("id", it) }
          })
    }
    for (i in 0 until node.childCount) {
      collectTexts(node.getChild(i), out)
    }
  }
}
