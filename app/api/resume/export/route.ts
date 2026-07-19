import type { NextRequest } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
} from "docx"
import { requireAuth, fail, handleError } from "@/lib/api/helpers"

type Contact = {
  fullName: string
  profession?: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  // NEW: portfolio & github links — header mein dikhte hain
  portfolio?: string
  github?: string
}

type ResumeData = {
  summary: string
  experience: { company: string; title: string; location?: string; dates: string; bullets: string[] }[]
  education: { school: string; degree: string; dates: string }[]
  skills: string[]
  // NEW
  projects: { name: string; dates: string; description: string[] }[]
  certifications: { name: string; institute: string; date: string }[]
  strengths: string[]
  achievements: { title: string; date: string }[]
}

// FIX: naya type — kaunsa layout banana hai.
type TemplateId = "classic" | "modern"

// ============================================================
// PDF BUILDERS
// ==================================================
// ==========

async function buildClassicPdf(contact: Contact, resume: ResumeData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const A4_WIDTH = 595.28
  const A4_HEIGHT = 841.89
  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
  const { width, height } = page.getSize()
  const margin = 50
  let y = height - margin

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
      y = height - margin
    }
  }

  const drawText = (text: string, opts: { size?: number; font?: typeof fontRegular; color?: any; x?: number } = {}) => {
    const size = opts.size || 10
    const font = opts.font || fontRegular
    ensureSpace(size + 4)
    page.drawText(text, { x: opts.x ?? margin, y, size, font, color: opts.color || rgb(0.1, 0.1, 0.1) })
    y -= size + 4
  }

  const drawWrapped = (text: string, opts: { size?: number; font?: typeof fontRegular; maxWidth?: number; x?: number } = {}) => {
    const size = opts.size || 10
    const font = opts.font || fontRegular
    const maxWidth = opts.maxWidth || width - margin * 2
    const words = text.split(" ")
    let line = ""
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        drawText(line, { size, font, x: opts.x })
        line = word
      } else {
        line = test
      }
    }
    if (line) drawText(line, { size, font, x: opts.x })
  }

  const divider = () => {
    ensureSpace(10)
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.75, color: rgb(0.7, 0.7, 0.7) })
    y -= 12
  }

  // FIX: contactLine ab yahin define hoti hai (pehle undefined thi -> crash hota tha)
  // NEW: portfolio & github bhi contact line mein shamil
  const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github]
    .filter(Boolean)
    .join("   |   ")

  // FIX: naam ko page ke center mein draw karte hain (pehle x: margin se left-aligned tha)
  const nameSize = 20
  const nameWidth = fontBold.widthOfTextAtSize(contact.fullName, nameSize)
  page.drawText(contact.fullName, {
    x: (width - nameWidth) / 2,
    y: height - margin - 15,
    size: nameSize,
    font: fontBold,
  })

  // FIX: naam ke neeche profession/domain (e.g. "SDE") center mein — sirf tab jab diya ho
  let headerY = height - margin - 35
  if (contact.profession) {
    const professionSize = 11
    const professionFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    const professionWidth = professionFont.widthOfTextAtSize(contact.profession, professionSize)
    page.drawText(contact.profession, {
      x: (width - professionWidth) / 2,
      y: headerY,
      size: professionSize,
      font: professionFont,
      color: rgb(0.35, 0.35, 0.35),
    })
    headerY -= 16
  }

  // FIX: contact line (email/phone/location/linkedin/portfolio/github) bhi center mein
  const contactSize = 9
  const contactWidth = fontRegular.widthOfTextAtSize(contactLine, contactSize)
  page.drawText(contactLine, {
    x: (width - contactWidth) / 2,
    y: headerY,
    size: contactSize,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  })

  // FIX: header ko manually draw kiya (page.drawText se), isliye y ko yahan
  // manually reset karna zaroori hai warna neeche ka content overlap karega.
  y = headerY - 13
  divider()

  if (resume.summary) {
    drawText("PROFESSIONAL SUMMARY", { size: 11, font: fontBold })
    drawWrapped(resume.summary, { size: 10 })
    y -= 8
  }

  // NEW: Strengths — summary ke paas
  if (resume.strengths?.length) {
    drawText("STRENGTHS", { size: 11, font: fontBold })
    drawWrapped(resume.strengths.join("   ·   "), { size: 9.5 })
    y -= 8
  }

  if (resume.experience?.length) {
    drawText("EXPERIENCE", { size: 11, font: fontBold })
    for (const job of resume.experience) {
      ensureSpace(20)
      drawText(`${job.title} — ${job.company}`, { size: 10.5, font: fontBold })
      const meta = [job.location, job.dates].filter(Boolean).join("   |   ")
      drawText(meta, { size: 9, color: rgb(0.4, 0.4, 0.4) })
      for (const bullet of job.bullets) {
        drawWrapped(`•  ${bullet}`, { size: 9.5, maxWidth: width - margin * 2 - 10, x: margin + 4 })
      }
      y -= 6
    }
  }

  // NEW: Projects — experience ke saath side (same section flow)
  if (resume.projects?.length) {
    drawText("PROJECTS", { size: 11, font: fontBold })
    for (const proj of resume.projects) {
      ensureSpace(20)
      drawText(proj.name, { size: 10.5, font: fontBold })
      if (proj.dates) drawText(proj.dates, { size: 9, color: rgb(0.4, 0.4, 0.4) })
      for (const line of proj.description) {
        drawWrapped(`•  ${line}`, { size: 9.5, maxWidth: width - margin * 2 - 10, x: margin + 4 })
      }
      y -= 6
    }
  }

  if (resume.education?.length) {
    drawText("EDUCATION", { size: 11, font: fontBold })
    for (const ed of resume.education) {
      drawText(`${ed.degree} — ${ed.school}`, { size: 10, font: fontBold })
      if (ed.dates) drawText(ed.dates, { size: 9, color: rgb(0.4, 0.4, 0.4) })
    }
    y -= 6
  }

  // NEW: Certifications — institute name, certificate name, date
  if (resume.certifications?.length) {
    drawText("CERTIFICATIONS", { size: 11, font: fontBold })
    for (const cert of resume.certifications) {
      const title = cert.institute ? `${cert.name} — ${cert.institute}` : cert.name
      drawText(title, { size: 10, font: fontBold })
      if (cert.date) drawText(cert.date, { size: 9, color: rgb(0.4, 0.4, 0.4) })
    }
    y -= 6
  }

  // NEW: Achievements — Certifications ke turant baad, wahi format (title + date)
  if (resume.achievements?.length) {
    drawText("ACHIEVEMENTS", { size: 11, font: fontBold })
    for (const a of resume.achievements) {
      drawText(a.title, { size: 10, font: fontBold })
      if (a.date) drawText(a.date, { size: 9, color: rgb(0.4, 0.4, 0.4) })
    }
    y -= 6
  }

  if (resume.skills?.length) {
    drawText("SKILLS", { size: 11, font: fontBold })
    drawWrapped(resume.skills.join("   •   "), { size: 9.5 })
  }

  // NEW: chota watermark footer — har page ke bottom mein center mein
  const footerFont = fontRegular
  const footerText = "(CWK)"
  const footerSize = 7
  const footerWidth = footerFont.widthOfTextAtSize(footerText, footerSize)
  for (const p of pdfDoc.getPages()) {
    p.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 18,
      size: footerSize,
      font: footerFont,
      color: rgb(0.75, 0.75, 0.75),
    })
  }

  return pdfDoc.save()
}

// FIX: naya "modern" 2-column PDF builder — left sidebar (Education +
// Skills), right main column (Summary + Experience), bold underlined
// headings — jaisa reference image mein tha.
async function buildModernPdf(contact: Contact, resume: ResumeData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const A4_WIDTH = 595.28
  const A4_HEIGHT = 841.89
  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
  const { width, height } = page.getSize()
  const margin = 40
  const gutter = 20
  const leftColW = 170
  const leftX = margin
  const rightX = margin + leftColW + gutter
  const rightColW = width - margin - rightX

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  let yLeft = height - margin - 70 // leave room for header
  let yRight = height - margin - 70

  const newPageIfNeeded = (colY: number, needed: number) => {
    if (colY - needed < margin) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
      return height - margin
    }
    return colY
  }

  const drawWrappedAt = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    opts: { size?: number; font?: typeof fontRegular; color?: any; lineGap?: number } = {},
  ) => {
    const size = opts.size || 9
    const font = opts.font || fontRegular
    const color = opts.color || rgb(0.1, 0.1, 0.1)
    const lineGap = opts.lineGap ?? size + 3
    let y = startY
    const words = text.split(" ")
    let line = ""
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        page.drawText(line, { x, y, size, font, color })
        y -= lineGap
        line = word
      } else {
        line = test
      }
    }
    if (line) {
      page.drawText(line, { x, y, size, font, color })
      y -= lineGap
    }
    return y
  }

  const sectionHeading = (text: string, x: number, y: number, colW: number) => {
    y = newPageIfNeeded(y, 20)
    page.drawText(text.toUpperCase(), { x, y, size: 10.5, font: fontBold, color: rgb(0.07, 0.07, 0.07) })
    y -= 4
    page.drawLine({ start: { x, y }, end: { x: x + colW, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) })
    return y - 12
  }

  // Header (full width)
  const nameSize = 20
  const nameWidth = fontBold.widthOfTextAtSize(contact.fullName, nameSize)

  page.drawText(contact.fullName, {
    x: (width - nameWidth) / 2,
    y: height - margin - 15,
    size: nameSize,
    font: fontBold,
  })

  // FIX: naam ke neeche profession/domain (e.g. "SDE") center mein — sirf tab jab diya ho
  let modernHeaderY = height - margin - 32
  if (contact.profession) {
    const professionSize = 11
    const professionWidth = fontItalic.widthOfTextAtSize(contact.profession, professionSize)
    page.drawText(contact.profession, {
      x: (width - professionWidth) / 2,
      y: modernHeaderY,
      size: professionSize,
      font: fontItalic,
      color: rgb(0.35, 0.35, 0.35),
    })
    modernHeaderY -= 15
  }

  // NEW: portfolio & github bhi header contact line mein shamil
  const contactLine = [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github]
    .filter(Boolean)
    .join("   |   ")
  const contactSize = 9
  const contactWidth = fontRegular.widthOfTextAtSize(contactLine, contactSize)

  page.drawText(contactLine, {
    x: (width - contactWidth) / 2,
    y: modernHeaderY,
    size: contactSize,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  })
  const dividerY = modernHeaderY - 8
  page.drawLine({
    start: { x: margin, y: dividerY },
    end: { x: width - margin, y: dividerY },
    thickness: 0.75,
    color: rgb(0.7, 0.7, 0.7),
  })

  // FIX: profession add hone se header lamba ho sakta hai, isliye columns
  // ka starting point bhi dividerY ke hisaab se dynamically set karte hain
  yLeft = dividerY - 20
  yRight = dividerY - 20

  // ---- LEFT SIDEBAR: Education, Certifications, Skills, Strengths ----
  if (resume.education?.length) {
    yLeft = sectionHeading("Education", leftX, yLeft, leftColW)
    for (const ed of resume.education) {
      yLeft = newPageIfNeeded(yLeft, 30)
      yLeft = drawWrappedAt(ed.degree, leftX, yLeft, leftColW, { size: 9, font: fontBold })
      yLeft = drawWrappedAt(ed.school, leftX, yLeft, leftColW, { size: 8.5, color: rgb(0.35, 0.35, 0.35) })
      if (ed.dates) yLeft = drawWrappedAt(ed.dates, leftX, yLeft, leftColW, { size: 8, font: fontItalic, color: rgb(0.45, 0.45, 0.45) })
      yLeft -= 6
    }
    yLeft -= 6
  }

  // NEW: Certifications — sidebar, near education
  if (resume.certifications?.length) {
    yLeft = sectionHeading("Certifications", leftX, yLeft, leftColW)
    for (const cert of resume.certifications) {
      yLeft = newPageIfNeeded(yLeft, 30)
      yLeft = drawWrappedAt(cert.name, leftX, yLeft, leftColW, { size: 9, font: fontBold })
      if (cert.institute) yLeft = drawWrappedAt(cert.institute, leftX, yLeft, leftColW, { size: 8.5, color: rgb(0.35, 0.35, 0.35) })
      if (cert.date) yLeft = drawWrappedAt(cert.date, leftX, yLeft, leftColW, { size: 8, font: fontItalic, color: rgb(0.45, 0.45, 0.45) })
      yLeft -= 6
    }
    yLeft -= 6
  }

  // NEW: Achievements — Certifications ke turant baad, wahi format (title + date)
  if (resume.achievements?.length) {
    yLeft = sectionHeading("Achievements", leftX, yLeft, leftColW)
    for (const a of resume.achievements) {
      yLeft = newPageIfNeeded(yLeft, 30)
      yLeft = drawWrappedAt(a.title, leftX, yLeft, leftColW, { size: 9, font: fontBold })
      if (a.date) yLeft = drawWrappedAt(a.date, leftX, yLeft, leftColW, { size: 8, font: fontItalic, color: rgb(0.45, 0.45, 0.45) })
      yLeft -= 6
    }
    yLeft -= 6
  }

  if (resume.skills?.length) {
    yLeft = sectionHeading("Skills", leftX, yLeft, leftColW)
    for (const s of resume.skills) {
      yLeft = newPageIfNeeded(yLeft, 12)
      yLeft = drawWrappedAt(s, leftX, yLeft, leftColW, { size: 8.5 })
    }
    yLeft -= 6
  }

  // NEW: Strengths — sidebar, near skills/summary
  if (resume.strengths?.length) {
    yLeft = sectionHeading("Strengths", leftX, yLeft, leftColW)
    for (const s of resume.strengths) {
      yLeft = newPageIfNeeded(yLeft, 12)
      yLeft = drawWrappedAt(s, leftX, yLeft, leftColW, { size: 8.5 })
    }
  }

  // ---- RIGHT MAIN COLUMN: Summary, Experience, Projects, Achievements ----
  if (resume.summary) {
    yRight = sectionHeading("Summary", rightX, yRight, rightColW)
    yRight = drawWrappedAt(resume.summary, rightX, yRight, rightColW, { size: 9 })
    yRight -= 8
  }

  if (resume.experience?.length) {
    yRight = sectionHeading("Work Experience", rightX, yRight, rightColW)
    for (const job of resume.experience) {
      yRight = newPageIfNeeded(yRight, 24)
      yRight = drawWrappedAt(`${job.title} — ${job.company}`, rightX, yRight, rightColW, { size: 9.5, font: fontBold })
      const meta = [job.location, job.dates].filter(Boolean).join("   |   ")
      if (meta) yRight = drawWrappedAt(meta, rightX, yRight, rightColW, { size: 8, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
      for (const bullet of job.bullets) {
        yRight = newPageIfNeeded(yRight, 14)
        yRight = drawWrappedAt(`•  ${bullet}`, rightX + 4, yRight, rightColW - 4, { size: 8.5 })
      }
      yRight -= 8
    }
  }

  // NEW: Projects — main column, near experience
  if (resume.projects?.length) {
    yRight = sectionHeading("Projects", rightX, yRight, rightColW)
    for (const proj of resume.projects) {
      yRight = newPageIfNeeded(yRight, 24)
      yRight = drawWrappedAt(proj.name, rightX, yRight, rightColW, { size: 9.5, font: fontBold })
      if (proj.dates) yRight = drawWrappedAt(proj.dates, rightX, yRight, rightColW, { size: 8, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
      for (const line of proj.description) {
        yRight = newPageIfNeeded(yRight, 14)
        yRight = drawWrappedAt(`•  ${line}`, rightX + 4, yRight, rightColW - 4, { size: 8.5 })
      }
      yRight -= 8
    }
  }

  // NEW: chota watermark footer — har page ke bottom mein center mein
  const footerText = "(CWK)"
  const footerSize = 7
  const footerWidth = fontRegular.widthOfTextAtSize(footerText, footerSize)
  for (const p of pdfDoc.getPages()) {
    p.drawText(footerText, {
      x: (width - footerWidth) / 2,
      y: 14,
      size: footerSize,
      font: fontRegular,
      color: rgb(0.75, 0.75, 0.75),
    })
  }

  return pdfDoc.save()
}
// DOCX BUILDERS
// ============================================================

async function buildClassicDocx(contact: Contact, resume: ResumeData): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: contact.fullName,
          bold: true,
          size: 32,
        }),
      ],
    }),
  )

  if (contact.profession) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: contact.profession,
            size: 22,
            color: "666666",
          }),
        ],
      }),
    )
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          // NEW: portfolio & github bhi contact line mein shamil
          text: [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github]
            .filter(Boolean)
            .join("   |   "),
          size: 18,
          color: "595959",
        }),
      ],
    }),
  )

  children.push(new Paragraph({ text: "" }))
  children.push(new Paragraph({ text: "" }))

  if (resume.summary) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Professional Summary" }))
    children.push(new Paragraph({ children: [new TextRun({ text: resume.summary, size: 20 })] }))
    children.push(new Paragraph({ text: "" }))
  }

  // NEW: Strengths — summary ke paas
  if (resume.strengths?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Strengths" }))
    children.push(new Paragraph({ children: [new TextRun({ text: resume.strengths.join("   ·   "), size: 19 })] }))
    children.push(new Paragraph({ text: "" }))
  }

  if (resume.experience?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Experience" }))
    for (const job of resume.experience) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${job.title} — ${job.company}`, bold: true, size: 21 })] }))
      const meta = [job.location, job.dates].filter(Boolean).join("   |   ")
      if (meta) children.push(new Paragraph({ children: [new TextRun({ text: meta, size: 18, color: "595959" })] }))
      for (const bullet of job.bullets) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bullet, size: 19 })] }))
      }
      children.push(new Paragraph({ text: "" }))
    }
  }

  // NEW: Projects — experience ke saath
  if (resume.projects?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Projects" }))
    for (const proj of resume.projects) {
      children.push(new Paragraph({ children: [new TextRun({ text: proj.name, bold: true, size: 21 })] }))
      if (proj.dates) children.push(new Paragraph({ children: [new TextRun({ text: proj.dates, size: 18, color: "595959" })] }))
      for (const line of proj.description) {
        children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: line, size: 19 })] }))
      }
      children.push(new Paragraph({ text: "" }))
    }
  }

  if (resume.education?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Education" }))
    for (const ed of resume.education) {
      children.push(new Paragraph({ children: [new TextRun({ text: `${ed.degree} — ${ed.school}`, bold: true, size: 20 })] }))
      if (ed.dates) children.push(new Paragraph({ children: [new TextRun({ text: ed.dates, size: 18, color: "595959" })] }))
    }
    children.push(new Paragraph({ text: "" }))
  }

  // NEW: Certifications
  if (resume.certifications?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Certifications" }))
    for (const cert of resume.certifications) {
      const title = cert.institute ? `${cert.name} — ${cert.institute}` : cert.name
      children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 20 })] }))
      if (cert.date) children.push(new Paragraph({ children: [new TextRun({ text: cert.date, size: 18, color: "595959" })] }))
    }
    children.push(new Paragraph({ text: "" }))
  }

  // NEW: Achievements — Certifications ke turant baad, wahi format (title + date)
  if (resume.achievements?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Achievements" }))
    for (const a of resume.achievements) {
      children.push(new Paragraph({ children: [new TextRun({ text: a.title, bold: true, size: 20 })] }))
      if (a.date) children.push(new Paragraph({ children: [new TextRun({ text: a.date, size: 18, color: "595959" })] }))
    }
    children.push(new Paragraph({ text: "" }))
  }

  if (resume.skills?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Skills" }))
    children.push(new Paragraph({ children: [new TextRun({ text: resume.skills.join("   •   "), size: 19 })] }))
  }

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 900, right: 900 } },
        },
        // NEW: chota watermark footer
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "(CWK)", size: 12, color: "BBBBBB" })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
  return Packer.toBuffer(doc)
}

// FIX: naya "modern" 2-column DOCX builder — ek Table (1 row, 2 cells) use
// karke sidebar + main column banate hain, bold underlined headings ke saath.
async function buildModernDocx(contact: Contact, resume: ResumeData): Promise<Buffer> {
  const PAGE_W = 11906
  const PAGE_H = 16838
  const MARGIN = 900
  const CONTENT_W = PAGE_W - MARGIN * 2
  const LEFT_W = Math.round(CONTENT_W * 0.34)
  const RIGHT_W = CONTENT_W - LEFT_W

  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
  const cellNoBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 160, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "444444", space: 2 } },
      children: [new TextRun({ text, bold: true, size: 20, color: "111111" })],
    })

  const bodyText = (text: string, extra: any = {}) =>
    new Paragraph({ spacing: { after: extra.after ?? 100 }, children: [new TextRun({ text, size: 18, color: "222222", ...extra })] })

  const bullet = (text: string) =>
    new Paragraph({
      spacing: { after: 50 },
      indent: { left: 200, hanging: 150 },
      children: [new TextRun({ text: "•  ", size: 18 }), new TextRun({ text, size: 18, color: "222222" })],
    })

  const jobTitle = (text: string) =>
    new Paragraph({
      spacing: { before: 120, after: 20 },
      children: [new TextRun({ text, bold: true, size: 19, underline: {}, color: "111111" })],
    })

  const meta = (text: string) =>
    new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text, size: 16, italics: true, color: "444444" })] })

  const leftChildren: Paragraph[] = []
  if (resume.education?.length) {
    leftChildren.push(sectionHeading("Education"))
    for (const ed of resume.education) {
      leftChildren.push(bodyText(ed.degree, { bold: true, after: 20 }))
      leftChildren.push(bodyText(ed.school, { after: 20 }))
      if (ed.dates) leftChildren.push(bodyText(ed.dates, { after: 120, italics: true }))
    }
  }
  // NEW: Certifications — sidebar, near education
  if (resume.certifications?.length) {
    leftChildren.push(sectionHeading("Certifications"))
    for (const cert of resume.certifications) {
      leftChildren.push(bodyText(cert.name, { bold: true, after: 20 }))
      if (cert.institute) leftChildren.push(bodyText(cert.institute, { after: 20 }))
      if (cert.date) leftChildren.push(bodyText(cert.date, { after: 120, italics: true }))
    }
  }
  // NEW: Achievements — Certifications ke turant baad, wahi format (title + date)
  if (resume.achievements?.length) {
    leftChildren.push(sectionHeading("Achievements"))
    for (const a of resume.achievements) {
      leftChildren.push(bodyText(a.title, { bold: true, after: 20 }))
      if (a.date) leftChildren.push(bodyText(a.date, { after: 120, italics: true }))
    }
  }
  if (resume.skills?.length) {
    leftChildren.push(sectionHeading("Skills"))
    for (const s of resume.skills) leftChildren.push(bullet(s))
  }
  // NEW: Strengths — sidebar, near skills/summary
  if (resume.strengths?.length) {
    leftChildren.push(sectionHeading("Strengths"))
    for (const s of resume.strengths) leftChildren.push(bullet(s))
  }
  if (leftChildren.length === 0) leftChildren.push(new Paragraph({ text: "" }))

  const rightChildren: Paragraph[] = []
  if (resume.summary) {
    rightChildren.push(sectionHeading("Summary"))
    rightChildren.push(bodyText(resume.summary))
  }
  if (resume.experience?.length) {
    rightChildren.push(sectionHeading("Work Experience"))
    for (const job of resume.experience) {
      rightChildren.push(jobTitle(`${job.title} — ${job.company}`))
      const metaLine = [job.location, job.dates].filter(Boolean).join("   |   ")
      if (metaLine) rightChildren.push(meta(metaLine))
      for (const b of job.bullets) rightChildren.push(bullet(b))
    }
  }
  // NEW: Projects — main column, near experience
  if (resume.projects?.length) {
    rightChildren.push(sectionHeading("Projects"))
    for (const proj of resume.projects) {
      rightChildren.push(jobTitle(proj.name))
      if (proj.dates) rightChildren.push(meta(proj.dates))
      for (const line of proj.description) rightChildren.push(bullet(line))
    }
  }
  if (rightChildren.length === 0) rightChildren.push(new Paragraph({ text: "" }))

  const layoutTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [LEFT_W, RIGHT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: LEFT_W, type: WidthType.DXA },
            borders: cellNoBorders,
            margins: { top: 100, bottom: 100, left: 0, right: 200 },
            children: leftChildren,
          }),
          new TableCell({
            width: { size: RIGHT_W, type: WidthType.DXA },
            borders: cellNoBorders,
            margins: { top: 100, bottom: 100, left: 200, right: 0 },
            children: rightChildren,
          }),
        ],
      }),
    ],
  })

  const doc = new DocxDocument({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
        // NEW: chota watermark footer
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "(CWK)", size: 12, color: "BBBBBB" })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: contact.fullName, bold: true, size: 32, color: "111111" })],
          }),
          // FIX: naam ke neeche profession/domain (e.g. "SDE") — sirf tab jab diya ho
          ...(contact.profession
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [new TextRun({ text: contact.profession, italics: true, size: 22, color: "595959" })],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA", space: 6 } },
            children: [
              new TextRun({
                // NEW: portfolio & github bhi header contact line mein shamil
                text: [contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github]
                  .filter(Boolean)
                  .join("   |   "),
                size: 18,
                color: "595959",
              }),
            ],
          }),
          layoutTable,
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

// ============================================================
// ROUTE HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    requireAuth(req)
    const { format, template, contact, resume } = await req.json()

    if (format !== "pdf" && format !== "docx") {
      return fail("format must be 'pdf' or 'docx'", 400)
    }
    if (!contact?.fullName || !resume) {
      return fail("Missing contact or resume data", 400)
    }

    // FIX: template optional hai — na diya ho to "classic" default.
    const selectedTemplate: TemplateId = template === "modern" ? "modern" : "classic"

    // NEW: naye arrays optional ho sakte hain (purani requests ke liye backward-compatible)
    const normalizedResume: ResumeData = {
      ...resume,
      projects: resume.projects || [],
      certifications: resume.certifications || [],
      strengths: resume.strengths || [],
      achievements: resume.achievements || [],
    }

    if (format === "pdf") {
      const bytes =
        selectedTemplate === "modern"
          ? await buildModernPdf(contact, normalizedResume)
          : await buildClassicPdf(contact, normalizedResume)
      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${contact.fullName.replace(/\s+/g, "_")}_Resume.pdf"`,
        },
      })
    }

    const buffer =
      selectedTemplate === "modern"
        ? await buildModernDocx(contact, normalizedResume)
        : await buildClassicDocx(contact, normalizedResume)
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${contact.fullName.replace(/\s+/g, "_")}_Resume.docx"`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}