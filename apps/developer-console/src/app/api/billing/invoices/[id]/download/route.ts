import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

/**
 * GET /api/billing/invoices/:id/download - Download invoice PDF
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    // Find the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "인보이스를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // If the invoice has a stored PDF URL, redirect to it
    if (invoice.pdfUrl) {
      return NextResponse.redirect(invoice.pdfUrl)
    }

    // Generate a simple invoice text representation
    // In production, you would use a PDF library like jsPDF or PDFKit
    const invoiceContent = generateInvoiceContent(invoice)

    // Return as a downloadable text file (simulating PDF)
    // In production, this would be actual PDF binary
    return new NextResponse(invoiceContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice-${invoice.id}.txt"`,
      },
    })
  } catch (error) {
    console.error("Error downloading invoice:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인보이스 다운로드에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}

interface InvoiceData {
  id: string
  amount: unknown
  currency: string
  status: string
  periodStart: Date
  periodEnd: Date
  dueDate: Date | null
  paidAt: Date | null
  description: string | null
  createdAt: Date
  organization: {
    name: string
  }
}

function generateInvoiceContent(invoice: InvoiceData): string {
  const formatDate = (date: Date) => date.toISOString().split("T")[0]
  const formatCurrency = (amount: unknown, currency: string) => {
    const numAmount =
      typeof amount === "object" && amount !== null ? Number(amount.toString()) : Number(amount)
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: currency,
    }).format(numAmount)
  }

  return `
================================================================================
                               DEEPSIGHT INVOICE
================================================================================

Invoice Number: ${invoice.id}
Date: ${formatDate(invoice.createdAt)}
Status: ${invoice.status}

--------------------------------------------------------------------------------
Bill To:
  ${invoice.organization.name}

--------------------------------------------------------------------------------
Invoice Period:
  From: ${formatDate(invoice.periodStart)}
  To:   ${formatDate(invoice.periodEnd)}

${invoice.dueDate ? `Due Date: ${formatDate(invoice.dueDate)}` : ""}
${invoice.paidAt ? `Paid Date: ${formatDate(invoice.paidAt)}` : ""}

--------------------------------------------------------------------------------
Description:
  ${invoice.description || "DeepSight API Usage"}

--------------------------------------------------------------------------------
                                                    Total: ${formatCurrency(invoice.amount, invoice.currency)}
================================================================================

Thank you for your business!

DeepSight - AI Persona-based Content Recommendation Platform
https://deepsight.ai

================================================================================
`.trim()
}
