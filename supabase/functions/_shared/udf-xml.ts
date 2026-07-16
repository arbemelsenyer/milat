// Single source for UYAP UDF content.xml generation. Used by both the
// generate-official-document edge function and the client (OfficialDocumentsPanel),
// so a Textarea edit made after server generation can still produce a UDF that
// matches the on-screen text without a second round trip.
//
// Schema: <template format_id="1.8"> with a single CDATA text pool (<content>)
// and <elements> paragraphs whose <content startOffset length/> children
// reference it via character offsets (NOT byte offsets — every Turkish
// character counts as exactly 1, hence Array.from().length below). Runs are
// contiguous: every character in the pool, including the "\n" line
// separators, belongs to exactly one run — verified against a real
// UYAP-exported .udf sample. A blank line is just a paragraph whose sole run
// is the "\n" itself; no placeholder character.
export function buildUdfXml(text: string): string {
  const rawLines = text.split("\n");
  let pool = "";
  const paragraphElems: string[] = [];
  let offset = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const hasNext = i < rawLines.length - 1;
    const line = hasNext ? rawLines[i] + "\n" : rawLines[i];
    const length = Array.from(line).length;
    if (length === 0) continue;
    paragraphElems.push(`    <paragraph><content startOffset="${offset}" length="${length}"/></paragraph>`);
    pool += line;
    offset += length;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8">
  <content><![CDATA[${pool}]]></content>
  <properties><pageFormat mediaSizeName="1" leftMargin="70.875" rightMargin="70.875" topMargin="70.875" bottomMargin="70.875" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>
  <elements resolver="hvl-default">
${paragraphElems.join("\n")}
  </elements>
  <styles>
    <style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" foreground="-13421773" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" />
    <style name="hvl-default" family="Times New Roman" size="12" description="Gövde" />
  </styles>
</template>`;
}
