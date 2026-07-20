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
  private val lock = Any()

  fun add(context: Context, record: JSONObject) {
    synchronized(lock) {
      val arr = readArray(context)
      arr.put(record)
      val trimmed =
          if (arr.length() > MAX) {
            val start = arr.length() - MAX
            JSONArray().also { for (i in start until arr.length()) it.put(arr.get(i)) }
          } else arr
      file(context).writeText(trimmed.toString())
    }
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
