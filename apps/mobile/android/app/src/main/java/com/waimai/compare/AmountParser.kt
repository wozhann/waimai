package com.waimai.compare

import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Extracts a price breakdown from the flat list of on-screen text nodes captured
 * from a checkout (结算) page. All amounts are returned in 分 (fen, integer) to
 * match the engine.
 *
 * Calibrated 2026-07 against three real pages on a device (see per-app notes):
 *  - 美团 (com.sankuai.meituan): rich tree; the label and its amount live in
 *    SEPARATE sibling nodes and the ¥ is sometimes split from the digits
 *    ("¥" + "46"). No "实付" label — the payable is shown as "券前 ¥46".
 *  - 饿了么 (me.ele): draws most rows as custom graphics, so only ~10 text
 *    nodes are exposed. 打包费/配送费/合计 are NOT readable, but the final
 *    total ("21.08") IS, as a bare number in the bottom pay bar.
 *  - 京东 (com.jingdong.app.mall): clean, fully-labeled rows; also exposes
 *    "本单¥24.80元" as a content description.
 *
 * The single reliable cross-app signal is the FINAL to-hand price: it is always
 * the lowest money node on screen (the pay bar). We therefore group nodes into
 * rows (by vertical overlap), read each row left-to-right, and:
 *  - take the final price from an explicit 实付/需支付/合计/券前/本单 label if
 *    present, otherwise the lowest non-savings money node on screen;
 *  - fill subtotal / packaging / delivery / savings from labelled rows when the
 *    app exposes them (best-effort — several apps don't).
 *
 * The raw `texts` are always kept with each capture, so rules can be re-tuned
 * against new dumps without another build.
 */
object AmountParser {
  /** A signed money token, e.g. "46", "¥46", "-¥13.00", "24.80". */
  private val MONEY = Regex("^-?[¥￥]?\\s*\\d+(?:\\.\\d{1,2})?$")

  /** Any amount inside a longer string, e.g. the "30.7" in "共减¥30.7". */
  private val AMOUNT = Regex("\\d+(?:\\.\\d{1,2})?")

  /** Labels that explicitly mark the to-hand total. */
  private val FINAL_LABELS = listOf("实付", "需支付", "本单", "合计", "券前")

  /**
   * A money node is NOT the payable when its own text / left-hand label carries
   * one of these: it is a saving, an unclaimed offer, an ad, or an ETA.
   */
  private val NON_PAYABLE = listOf(
      "共减", "已优惠", "已省", "省到", "返", "最高", "赔", "起赔",
      "优惠券包", "省钱卡", "待使用", "点击使用", "暂无", "可减",
      "预计", "元红包", "件", "人份", "急送", "送达", "分钟")

  /** When any of these appear, delivery/运费 is waived to 0 regardless of struck price. */
  private val DELIVERY_WAIVED = listOf("免配送费", "已免运费", "免运费", "惊喜免配", "配送费全免", "0元配送")

  private data class Node(
      val text: String,
      val top: Int,
      val bottom: Int,
      val left: Int,
      val right: Int,
  )

  fun parse(texts: List<JSONObject>): JSONObject {
    val nodes = texts.mapNotNull { toNode(it) }
    val rows = groupRows(nodes)
    val allText = nodes.joinToString(" ") { it.text }
    val result = JSONObject()

    finalPrice(nodes, rows)?.let { result.put("finalFen", it) }
    rowAmount(rows, listOf("商品金额", "商品小计", "商品总额"))?.let { result.put("subtotalFen", it) }
    rowAmount(rows, listOf("打包费", "包装费"))?.let { result.put("packagingFen", it) }
    delivery(rows, allText)?.let { result.put("deliveryFen", it) }
    rowAmount(rows, listOf("共减", "已优惠", "已省"))?.let { result.put("savingsFen", it) }

    return result
  }

  private fun toNode(o: JSONObject): Node? {
    val text = o.optString("text").trim()
    if (text.isEmpty()) return null
    val top = o.optInt("top", 0)
    val left = o.optInt("left", 0)
    // Fall back to a small box if the (older) capture lacks bottom/right.
    val bottom = o.optInt("bottom", top + 1)
    val right = o.optInt("right", left + 1)
    return Node(text, top, bottom, left, right)
  }

  /** Cluster nodes into visual rows by vertical overlap; each row sorted left→right. */
  private fun groupRows(nodes: List<Node>): List<List<Node>> {
    val rows = ArrayList<MutableList<Node>>()
    for (n in nodes.sortedBy { it.top }) {
      val row = rows.firstOrNull { r -> r.any { sameRow(it, n) } }
      if (row != null) row.add(n) else rows.add(mutableListOf(n))
    }
    rows.forEach { it.sortBy { n -> n.left } }
    return rows
  }

  private fun sameRow(a: Node, b: Node): Boolean {
    val overlap = min(a.bottom, b.bottom) - max(a.top, b.top)
    if (overlap <= 0) return false
    val minHeight = min(a.bottom - a.top, b.bottom - b.top).coerceAtLeast(1)
    return overlap >= 0.5 * minHeight
  }

  private fun rowText(row: List<Node>): String = row.joinToString(" ") { it.text }

  private fun fen(yuan: Double): Int = (yuan * 100).roundToInt()

  private fun amountsIn(s: String): List<Double> =
      AMOUNT.findAll(s).mapNotNull { it.value.toDoubleOrNull() }.toList()

  /**
   * The rightmost amount on the first row that contains any keyword. Rightmost,
   * because the effective figure sits at the end of the row (e.g. a struck
   * original ¥4.00 followed by the real ¥0.00).
   */
  private fun rowAmount(rows: List<List<Node>>, keywords: List<String>): Int? {
    val row = rows.firstOrNull { r -> keywords.any { rowText(r).contains(it) } } ?: return null
    return amountsIn(rowText(row)).lastOrNull()?.let { fen(it) }
  }

  private fun delivery(rows: List<List<Node>>, allText: String): Int? {
    val row = rows.firstOrNull { r ->
      rowText(r).let { it.contains("配送费") || it.contains("运费") }
    } ?: return null
    // A waiver (免配送费 / 已免运费 …) may sit on a different row than the struck
    // original price, so check the whole page, not just this row.
    if (DELIVERY_WAIVED.any { allText.contains(it) }) return 0
    return amountsIn(rowText(row)).lastOrNull()?.let { fen(it) }
  }

  /**
   * To-hand price: prefer an explicit 实付/需支付/合计/券前/本单 money node,
   * else the lowest (bottom-most) money node that is not a saving/offer/ad.
   */
  private fun finalPrice(nodes: List<Node>, rows: List<List<Node>>): Int? {
    val candidates = nodes.filter { MONEY.matches(it.text) }.mapNotNull { node ->
      val value = AMOUNT.find(node.text)?.value?.toDoubleOrNull() ?: return@mapNotNull null
      val label = leftLabel(node, rows)
      val context = label + " " + node.text
      if (NON_PAYABLE.any { context.contains(it) }) return@mapNotNull null
      Triple(node, value, context)
    }
    if (candidates.isEmpty()) return null
    val explicit = candidates.filter { (_, _, ctx) -> FINAL_LABELS.any { ctx.contains(it) } }
    val chosen = (explicit.ifEmpty { candidates }).maxByOrNull { it.first.bottom }
    return chosen?.let { fen(it.second) }
  }

  /** The text node immediately to the left of [node] on the same row (its label). */
  private fun leftLabel(node: Node, rows: List<List<Node>>): String {
    val row = rows.firstOrNull { it.contains(node) } ?: return ""
    return row.filter { it.right <= node.left && !MONEY.matches(it.text) }
        .maxByOrNull { it.right }?.text ?: ""
  }
}
