import os
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image, KeepTogether
)
from config import COMPANY, TERMS, CARGO_ARRENDATARIO, CARGO_ARRENDADOR, LOGO_PATH

# ─── Paleta ───────────────────────────────────────────────────────────────────
ORANGE = colors.HexColor("#E8651A")
DARK   = colors.HexColor("#222222")
G1     = colors.HexColor("#F5F5F5")   # fondo filas alternas
G2     = colors.HexColor("#DDDDDD")   # bordes
G3     = colors.HexColor("#666666")   # texto secundario
G4     = colors.HexColor("#444444")   # headers secciones
G5     = colors.HexColor("#333333")   # header tabla
WHITE  = colors.white


# ─── Formatos numéricos ───────────────────────────────────────────────────────
def _clp(v):
    try:    return "$ {:,.0f}".format(float(v)).replace(",", ".")
    except: return "$ 0"

def _uf(v):
    try:    return "UF {:,.3f}".format(float(v)).replace(",", "X").replace(".", ",").replace("X", ".")
    except: return "UF 0,000"


# ─── Estilos ──────────────────────────────────────────────────────────────────
def _s():
    return {
        "h2":    ParagraphStyle("h2",   fontName="Helvetica-Bold",   fontSize=9,   textColor=G4,   leading=13),
        "co":    ParagraphStyle("co",   fontName="Helvetica-Bold",   fontSize=9,   textColor=DARK, leading=13),
        "sub":   ParagraphStyle("sub",  fontName="Helvetica",        fontSize=7.5, textColor=G3,   leading=11),
        "lbl":   ParagraphStyle("lbl",  fontName="Helvetica-Bold",   fontSize=7.5, textColor=G4,   leading=11),
        "val":   ParagraphStyle("val",  fontName="Helvetica",        fontSize=7.5, textColor=DARK, leading=11),
        "th":    ParagraphStyle("th",   fontName="Helvetica-Bold",   fontSize=7,   textColor=WHITE,alignment=TA_CENTER, leading=10),
        "td":    ParagraphStyle("td",   fontName="Helvetica",        fontSize=7.5, textColor=DARK, leading=11),
        "td_r":  ParagraphStyle("td_r", fontName="Helvetica",        fontSize=7.5, textColor=DARK, alignment=TA_RIGHT,  leading=11),
        "td_c":  ParagraphStyle("td_c", fontName="Helvetica",        fontSize=7.5, textColor=DARK, alignment=TA_CENTER, leading=11),
        "td_g":  ParagraphStyle("td_g", fontName="Helvetica",        fontSize=7,   textColor=G3,   alignment=TA_RIGHT,  leading=9),
        "note":  ParagraphStyle("note", fontName="Helvetica-Oblique",fontSize=7,   textColor=G3,   leading=10),
        "terms": ParagraphStyle("terms",fontName="Helvetica",        fontSize=7,   textColor=G3,   leading=10, alignment=TA_JUSTIFY),
        "sub_c": ParagraphStyle("sub_c",fontName="Helvetica",        fontSize=7.5, textColor=G3,   alignment=TA_CENTER, leading=10),
        "tl":    ParagraphStyle("tl",   fontName="Helvetica-Bold",   fontSize=8.5, textColor=DARK, alignment=TA_RIGHT),
        "tv":    ParagraphStyle("tv",   fontName="Helvetica-Bold",   fontSize=8.5, textColor=DARK, alignment=TA_RIGHT),
        "gl":    ParagraphStyle("gl",   fontName="Helvetica-Bold",   fontSize=10,  textColor=WHITE, alignment=TA_RIGHT),
        "gv":    ParagraphStyle("gv",   fontName="Helvetica-Bold",   fontSize=10,  textColor=WHITE, alignment=TA_RIGHT),
    }


def generate_pdf(data: dict) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=1.5*cm,  bottomMargin=2.2*cm)

    W  = A4[0] - 3.6*cm
    s  = _s()
    uf = data.get("uf_valor")
    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    logo = Spacer(1,1)
    if os.path.exists(LOGO_PATH):
        try: logo = Image(LOGO_PATH, width=4*cm, height=2.6*cm, kind="proportional")
        except: pass

    co_block = [
        Paragraph(COMPANY["name"], s["co"]),
        Spacer(1, 2),
        Paragraph(COMPANY["giro"],    s["sub"]),
        Paragraph(f'R.U.T.: {COMPANY["rut"]}', s["sub"]),
        Paragraph(COMPANY["address"], s["sub"]),
        Paragraph(f'{COMPANY["email"]}  |  {COMPANY["web"]}', s["sub"]),
    ]

    num_lbl = ParagraphStyle("nl", fontName="Helvetica-Bold", fontSize=7.5, textColor=G3, alignment=TA_RIGHT)
    num_val = ParagraphStyle("nv", fontName="Helvetica-Bold", fontSize=16,  textColor=DARK, alignment=TA_RIGHT)
    meta = [
        [Paragraph("COTIZACION N\u00b0", num_lbl),
         Paragraph(f'{data["numero"]:04d}',  num_val)],
        [Paragraph("Fecha:",    s["lbl"]),
         Paragraph(data["fecha"], ParagraphStyle("fd",fontName="Helvetica",fontSize=7.5,textColor=DARK,alignment=TA_RIGHT))],
        [Paragraph("Validez:", s["lbl"]),
         Paragraph(f'{data.get("validez_dias",30)} dias',
                   ParagraphStyle("vd",fontName="Helvetica",fontSize=7.5,textColor=DARK,alignment=TA_RIGHT))],
    ]
    if uf:
        meta.append([Paragraph("Valor UF:", s["lbl"]),
                     Paragraph(_clp(uf),
                               ParagraphStyle("ud",fontName="Helvetica-Bold",fontSize=7.5,textColor=ORANGE,alignment=TA_RIGHT))])

    meta_tbl = Table(meta, colWidths=[2.5*cm, 4.5*cm])
    meta_tbl.setStyle(TableStyle([
        ("ALIGN",        (0,0),(-1,-1),"RIGHT"),
        ("VALIGN",       (0,0),(-1,-1),"MIDDLE"),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("TOPPADDING",   (0,0),(-1,-1),2),
    ]))

    hdr = Table([[logo, co_block, meta_tbl]],
                 colWidths=[4.2*cm, W-11.5*cm, 7.3*cm])
    hdr.setStyle(TableStyle([
        ("VALIGN",      (0,0),(-1,-1),"TOP"),
        ("LEFTPADDING", (1,0),(1,0),  12),
        ("RIGHTPADDING",(2,0),(2,0),  0),
    ]))
    story.append(hdr)
    story.append(HRFlowable(width="100%", thickness=1, color=G2, spaceAfter=10))

    # ── CLIENTE ───────────────────────────────────────────────────────────────
    story.append(Paragraph("DATOS DEL CLIENTE", s["h2"]))
    story.append(Spacer(1, 4))

    cli = data["cliente"]
    lc = [("Empresa / Razon Social", cli.get("empresa","")),
          ("R.U.T.",                  cli.get("rut","")),
          ("Direccion Comercial",     cli.get("direccion","")),
          ("Correo electronico",      cli.get("email",""))]
    rc = [("Contacto",  cli.get("nombre","")),
          ("Cargo",     cli.get("cargo","")),
          ("Telefono",  cli.get("fono",""))]

    def crow(lst):
        return [[Paragraph(f"{l}:", s["lbl"]), Paragraph(v or "—", s["val"])] for l,v in lst]

    lw = 3.3*cm; vw = W/2 - lw - 0.5*cm
    lt = Table(crow(lc), colWidths=[lw,vw])
    rt = Table(crow(rc), colWidths=[lw,vw])
    for t in [lt,rt]:
        t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                               ("BOTTOMPADDING",(0,0),(-1,-1),3),
                               ("TOPPADDING",(0,0),(-1,-1),2)]))
    cli_outer = Table([[lt,rt]], colWidths=[W/2,W/2])
    cli_outer.setStyle(TableStyle([
        ("BACKGROUND",  (0,0),(-1,-1),G1),
        ("BOX",         (0,0),(-1,-1),0.5,G2),
        ("LEFTPADDING", (0,0),(-1,-1),10),
        ("RIGHTPADDING",(0,0),(-1,-1),10),
        ("TOPPADDING",  (0,0),(-1,-1),8),
        ("BOTTOMPADDING",(0,0),(-1,-1),8),
        ("VALIGN",      (0,0),(-1,-1),"TOP"),
    ]))
    story.append(cli_outer)
    story.append(Spacer(1, 12))

    # ── TABLA ÍTEMS ───────────────────────────────────────────────────────────
    story.append(Paragraph("DETALLE DE EQUIPOS Y SERVICIOS", s["h2"]))
    story.append(Spacer(1, 4))

    # anchos: N° | Descripcion | N°Eq | Unidad | Cant | Precio Unit | Total Moneda | Total $
    cn=0.6*cm; cneq=1.4*cm; cunit=1.6*cm; ccant=1.4*cm
    cup=2.6*cm; ctuf=2.8*cm; ctclp=2.8*cm
    cd = W - cn - cneq - cunit - ccant - cup - ctuf - ctclp

    headers = [
        Paragraph("N\u00b0",       s["th"]),
        Paragraph("Descripcion",   s["th"]),
        Paragraph("N\u00b0 Eq.",   s["th"]),
        Paragraph("Unidad",        s["th"]),
        Paragraph("Cant.",         s["th"]),
        Paragraph("Precio Unit.\n(neto)", s["th"]),
        Paragraph("Total UF / $",  s["th"]),
        Paragraph("Total en $",    s["th"]),
    ]
    rows = [headers]

    for i, item in enumerate(data["items"], 1):
        neq        = item.get("n_equipos", 1)
        moneda     = item.get("moneda", "$")
        up         = float(item.get("precio_unitario", 0))
        total_mon  = float(item.get("total_moneda", 0))  # en UF o $
        total_clp  = float(item.get("total_clp", 0))     # siempre en $

        # Descripcion
        desc = [Paragraph(f'<b>{item["nombre"]}</b>', s["td"])]
        if item.get("detalle"):
            desc.append(Paragraph(item["detalle"], s["note"]))

        # Precio unit
        up_str = _uf(up) if moneda == "UF" else _clp(up)
        up_cell = [Paragraph(up_str, s["td_r"])]
        if moneda == "UF" and uf:
            up_cell.append(Paragraph(f'({_clp(up * float(uf))})', s["td_g"]))

        # Total en moneda del item
        if moneda == "UF":
            tot_mon_cell = [Paragraph(_uf(total_mon), s["td_r"])]
            if uf:
                tot_mon_cell.append(Paragraph(f'({_clp(total_mon * float(uf))})', s["td_g"]))
        else:
            tot_mon_cell = [Paragraph(_clp(total_mon), s["td_r"])]

        # Total en $
        tot_clp_str = _clp(total_clp) if total_clp > 0 else ("—" if moneda == "UF" and not uf else _clp(total_clp))

        rows.append([
            Paragraph(str(i), s["td_c"]),
            desc,
            Paragraph(str(neq), s["td_c"]),
            Paragraph(item.get("tipo_precio", "Hora"), s["td_c"]),
            Paragraph(str(item.get("cantidad", 1)), s["td_c"]),
            up_cell,
            tot_mon_cell,
            Paragraph(tot_clp_str, s["td_r"]),
        ])

    n = len(rows)
    itbl = Table(rows, colWidths=[cn,cd,cneq,cunit,ccant,cup,ctuf,ctclp], repeatRows=1)
    itbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,0), G5),
        ("TEXTCOLOR",    (0,0),(-1,0), WHITE),
        ("ALIGN",        (0,0),(-1,0), "CENTER"),
        ("VALIGN",       (0,0),(-1,0), "MIDDLE"),
        ("TOPPADDING",   (0,0),(-1,0), 6),
        ("BOTTOMPADDING",(0,0),(-1,0), 6),
        ("FONTNAME",     (0,1),(-1,-1),"Helvetica"),
        ("FONTSIZE",     (0,1),(-1,-1), 7.5),
        ("VALIGN",       (0,1),(-1,-1),"TOP"),
        ("TOPPADDING",   (0,1),(-1,-1), 5),
        ("BOTTOMPADDING",(0,1),(-1,-1), 5),
        ("LEFTPADDING",  (0,0),(-1,-1), 4),
        ("RIGHTPADDING", (0,0),(-1,-1), 4),
        *[("BACKGROUND", (0,r),(-1,r), G1) for r in range(2,n,2)],
        ("GRID",         (0,0),(-1,-1), 0.3, G2),
        ("LINEBELOW",    (0,0),(-1,0),  0.5, G2),
        # Columna Total $ en negrita naranja
        ("TEXTCOLOR",    (7,1),( 7,-1), ORANGE),
        ("FONTNAME",     (7,1),( 7,-1),"Helvetica-Bold"),
    ]))
    story.append(itbl)
    story.append(Spacer(1, 6))

    # ── NOTA UF (si aplica) ───────────────────────────────────────────────────
    has_uf = any(item.get("moneda")=="UF" for item in data["items"])
    if has_uf and uf:
        nota_uf = Table([[Paragraph(
            f"Nota: Valores en UF calculados con 1 UF = {_clp(uf)} a la fecha de la cotizacion.",
            s["note"])]],
            colWidths=[W])
        nota_uf.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,-1),G1),
            ("BOX",         (0,0),(-1,-1),0.3,G2),
            ("LEFTPADDING", (0,0),(-1,-1),8),
            ("TOPPADDING",  (0,0),(-1,-1),5),
            ("BOTTOMPADDING",(0,0),(-1,-1),5),
        ]))
        story.append(nota_uf)
        story.append(Spacer(1, 4))

    # ── TOTALES ───────────────────────────────────────────────────────────────
    subtotal = float(data.get("subtotal", 0))
    iva      = float(data.get("iva", 0))
    total    = float(data.get("total", 0))

    tot_rows = [
        [Paragraph("Subtotal Neto:", s["tl"]), Paragraph(_clp(subtotal), s["tv"])],
        [Paragraph("IVA (19%):",     s["tl"]), Paragraph(_clp(iva),      s["tv"])],
    ]
    tot_inner = Table(tot_rows, colWidths=[4*cm, 3.5*cm])
    tot_inner.setStyle(TableStyle([
        ("ALIGN",       (0,0),(-1,-1),"RIGHT"),
        ("BOTTOMPADDING",(0,0),(-1,-1),3),
        ("TOPPADDING",  (0,0),(-1,-1),3),
    ]))

    grand = Table([[Paragraph("TOTAL CON IVA:", s["gl"]),
                    Paragraph(_clp(total),       s["gv"])]],
                  colWidths=[4*cm,3.5*cm])
    grand.setStyle(TableStyle([
        ("BACKGROUND",  (0,0),(-1,-1),ORANGE),
        ("ALIGN",       (0,0),(-1,-1),"RIGHT"),
        ("TOPPADDING",  (0,0),(-1,-1),6),
        ("BOTTOMPADDING",(0,0),(-1,-1),6),
        ("LEFTPADDING", (0,0),(-1,-1),8),
        ("RIGHTPADDING",(0,0),(-1,-1),8),
    ]))

    tot_block = Table([[tot_inner],[grand]], colWidths=[7.5*cm])
    tot_block.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"RIGHT"),
                                   ("TOPPADDING",(0,0),(-1,-1),2)]))
    tot_outer = Table([[Spacer(1,1), tot_block]], colWidths=[W-7.5*cm, 7.5*cm])
    tot_outer.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"BOTTOM")]))
    story.append(tot_outer)
    story.append(Spacer(1, 14))

    # ── RESPONSABILIDADES ─────────────────────────────────────────────────────
    def resp_tbl(title, lst, bg):
        rows_r = [[Paragraph(f"<b>{title}</b>",
                    ParagraphStyle("rh",fontName="Helvetica-Bold",fontSize=7.5,textColor=WHITE))]]
        rows_r += [[Paragraph(f"• {x}", s["td"])] for x in lst]
        t = Table(rows_r, colWidths=[W/2-0.3*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1,0),bg),
            ("FONTNAME",    (0,0),(-1,0),"Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,0),7.5),
            ("ALIGN",       (0,0),(-1,-1),"LEFT"),
            ("VALIGN",      (0,0),(-1,-1),"MIDDLE"),
            ("TOPPADDING",  (0,0),(-1,-1),4),
            ("BOTTOMPADDING",(0,0),(-1,-1),4),
            ("LEFTPADDING", (0,0),(-1,-1),8),
            ("GRID",        (0,0),(-1,-1),0.3,G2),
            *[("BACKGROUND",(0,r),(-1,r),G1) for r in range(2,len(lst)+1,2)],
        ]))
        return t

    resp_outer = Table([[
        resp_tbl("CARGO ARRENDATARIO (Cliente)", CARGO_ARRENDATARIO, colors.HexColor("#555555")),
        resp_tbl("CARGO ARRENDADOR (CYC)",       CARGO_ARRENDADOR,   colors.HexColor("#333333")),
    ]], colWidths=[W/2, W/2])
    resp_outer.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(1,0),(1,0),6)]))

    story.append(KeepTogether([
        Paragraph("RESPONSABILIDADES", s["h2"]),
        Spacer(1,4), resp_outer, Spacer(1,14),
    ]))

    # ── NOTAS ─────────────────────────────────────────────────────────────────
    if data.get("notas"):
        nt = Table([[Paragraph(data["notas"], s["note"])]], colWidths=[W])
        nt.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1),G1),
            ("BOX",        (0,0),(-1,-1),0.5,G2),
            ("LEFTPADDING",(0,0),(-1,-1),10),
            ("RIGHTPADDING",(0,0),(-1,-1),10),
            ("TOPPADDING", (0,0),(-1,-1),8),
            ("BOTTOMPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(KeepTogether([
            Paragraph("NOTAS ADICIONALES", s["h2"]),
            Spacer(1,4), nt, Spacer(1,14),
        ]))

    # ── TÉRMINOS ──────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("TERMINOS Y CONDICIONES", s["h2"]),
        Spacer(1,4),
        *[Paragraph(f"{i+1}. {t}", s["terms"]) for i,t in enumerate(TERMS)],
        Spacer(1,16),
    ]))

    # ── FIRMAS ────────────────────────────────────────────────────────────────
    firma = Table([[
        Table([[Paragraph("_______________________________",s["sub_c"])],
               [Paragraph(COMPANY["name"],s["sub_c"])],
               [Paragraph("Firma y Timbre",s["sub_c"])]],
              colWidths=[W/2-1*cm]),
        Table([[Paragraph("_______________________________",s["sub_c"])],
               [Paragraph(cli.get("empresa") or cli.get("nombre",""),s["sub_c"])],
               [Paragraph("Firma y Timbre Cliente",s["sub_c"])]],
              colWidths=[W/2-1*cm]),
    ]], colWidths=[W/2,W/2])
    firma.setStyle(TableStyle([("ALIGN",(0,0),(-1,-1),"CENTER"),("VALIGN",(0,0),(-1,-1),"BOTTOM")]))
    story.append(firma)

    # ── FOOTER ────────────────────────────────────────────────────────────────
    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(G4)
        canvas.rect(1.8*cm, 1.2*cm, A4[0]-3.6*cm, 0.35*cm, fill=1, stroke=0)
        canvas.setFillColor(WHITE)
        canvas.setFont("Helvetica", 6.5)
        canvas.drawCentredString(A4[0]/2, 1.33*cm,
            f"{COMPANY['name']}  |  RUT {COMPANY['rut']}  |  "
            f"{COMPANY['address']}  |  {COMPANY['email']}")
        canvas.setFillColor(G3)
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(A4[0]-1.8*cm, 0.85*cm, f"Pagina {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()
