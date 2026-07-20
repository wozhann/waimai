package com.waimai.compare

import org.json.JSONObject

/**
 * Best-effort extraction of a price breakdown from the flat list of on-screen
 * text nodes. This is deliberately generic: it looks for a keyword and a nearby
 * amount in the SAME text node. Real checkout pages often split the label and
 * the number into sibling nodes, so this is only a first pass — the raw `texts`
 * dump is always kept so the per-app rules can be calibrated on a real device.
 *
 * All amounts are returned in 分 (fen, integer) to match the engine.
 */
object AmountParser {
  // Keyword -> breakdown field. Order matters: earlier wins if a node matches
  // several (e.g. "会员红包" should map to member, checked before "红包").
  private val FIELDS =
      listOf(
          "小计" to "subtotalFen",
          "商品金额" to "subtotalFen",
          "商品小计" to "subtotalFen",
          "满减" to "manjianFen",
          "会员红包" to "memberFen",
          "会员" to "memberFen",
          "红包" to "hongbaoFen",
          "优惠券" to "couponFen",
          "配送费" to "deliveryFen",
          "配送" to "deliveryFen",
          "打包费" to "packagingFen",
          "包装费" to "packagingFen",
          "实付" to "finalFen",
          "需支付" to "finalFen",
          "合计" to "finalFen")

  private val AMOUNT = Regex("[¥￥]?\\s*(\\d+(?:\\.\\d{1,2})?)")

  fun parse(texts: List<JSONObject>): JSONObject {
    val result = JSONObject()
    for (obj in texts) {
      val t = obj.optString("text")
      for ((kw, field) in FIELDS) {
        if (result.has(field)) continue
        if (!t.contains(kw)) continue
        val m = AMOUNT.find(t) ?: continue
        val yuan = m.groupValues[1].toDoubleOrNull() ?: continue
        result.put(field, Math.round(yuan * 100).toInt())
      }
    }
    return result
  }
}
