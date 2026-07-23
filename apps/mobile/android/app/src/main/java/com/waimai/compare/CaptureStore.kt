package com.waimai.compare

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Persists captured checkout snapshots to a JSON file in the app's private
 * filesDir. The AccessibilityService (writer) and the RN bridge module (reader)
 * run in the SAME app process, so a process-wide lock is enough to keep the file
 * consistent. Nothing here ever leaves the device.
 */
object CaptureStore {
  private const val FILE = "waimai_captures.json"
  private const val MAX = 100
  // A checkout page emits many near-identical frames as it loads/animates. If the
  // newest record is the same app at the same to-hand price within this window,
  // we replace it with the newer (more settled) read instead of adding a card.
  private const val COALESCE_WINDOW_MS = 30000L
  private val lock = Any()

  fun add(context: Context, record: JSONObject) {
    synchronized(lock) {
      val arr = readArray(context)
      val lastIdx = arr.length() - 1
      if (lastIdx >= 0 && isSameOrder(arr.optJSONObject(lastIdx), record)) {
        arr.put(lastIdx, record) // replace in place — keep one card, latest values
        file(context).writeText(arr.toString())
        return
      }
      arr.put(record)
      val trimmed =
          if (arr.length() > MAX) {
            val start = arr.length() - MAX
            JSONArray().also { for (i in start until arr.length()) it.put(arr.get(i)) }
          } else arr
      file(context).writeText(trimmed.toString())
    }
  }

  /** Same delivery app + same parsed final price, captured close together in time. */
  private fun isSameOrder(a: JSONObject?, b: JSONObject): Boolean {
    a ?: return false
    if (a.optString("packageName") != b.optString("packageName")) return false
    val fa = a.optJSONObject("parsed")?.optInt("finalFen", Int.MIN_VALUE) ?: Int.MIN_VALUE
    val fb = b.optJSONObject("parsed")?.optInt("finalFen", Int.MIN_VALUE) ?: Int.MIN_VALUE
    if (fa != fb || fa == Int.MIN_VALUE) return false
    return Math.abs(b.optLong("capturedAt") - a.optLong("capturedAt")) < COALESCE_WINDOW_MS
  }

  fun all(context: Context): JSONArray = synchronized(lock) { readArray(context) }

  fun clear(context: Context) = synchronized(lock) { file(context).writeText("[]") }

  private fun file(context: Context) = File(context.filesDir, FILE)

  private fun readArray(context: Context): JSONArray {
    val f = file(context)
    if (!f.exists()) return JSONArray()
    return try {
      JSONArray(f.readText())
    } catch (e: Exception) {
      JSONArray()
    }
  }
}
