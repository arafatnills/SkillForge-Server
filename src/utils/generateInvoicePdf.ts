
import PDFDocument from "pdfkit";

interface InvoiceData {
    invoiceId: string;
    learnerName: string;
    learnerEmail: string;
    mentorName: string;
    mentorExpertise: string | null;
    appointmentId: string;
    serialNumber: number;
    joiningTime: Date;
    scheduleDate: Date;
    meetingLink: string;
    amount: number;
    transactionId: string;
    paidAt: Date;
}

export const generateInvoicePdf = (
    data: InvoiceData,
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "A4",
            margin: 45,
            bufferPages: false,
            info: {
                Title: `SkillForge Invoice ${data.invoiceId}`,
                Author: "SkillForge",
            },
        });

        const chunks: Buffer[] = [];

        const navy = "#102A56";
        const blue = "#2878E5";
        const muted = "#64748B";
        const light = "#EFF6FF";
        const border = "#DCE7F5";
        const green = "#059669";

        const left = 45;
        const right = 550;
        const width = right - left;

        const formatDate = (date: Date) =>
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }).format(date);

        const formatDateTime = (date: Date) =>
            new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(date);

        const formatTime = (date: Date) =>
            new Intl.DateTimeFormat("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }).format(date);

        const text = (
            value: string,
            x: number,
            y: number,
            options: {
                size?: number;
                color?: string;
                bold?: boolean;
                width?: number;
            } = {},
        ) => {
            doc
                .font(options.bold ? "Helvetica-Bold" : "Helvetica")
                .fontSize(options.size ?? 10)
                .fillColor(options.color ?? navy)
                .text(value, x, y, {
                    width: options.width ?? 230,
                    lineGap: 2,
                });
        };

        const line = (y: number) => {
            doc
                .moveTo(left, y)
                .lineTo(right, y)
                .lineWidth(0.8)
                .strokeColor(border)
                .stroke();
        };

        const section = (
            title: string,
            y: number,
            height: number,
        ) => {
            doc
                .roundedRect(left, y, width, height, 9)
                .lineWidth(0.8)
                .strokeColor(border)
                .stroke();

            doc
                .roundedRect(left, y, width, 36, 9)
                .fillColor(light)
                .fill();

            doc
                .rect(left, y + 25, width, 11)
                .fillColor(light)
                .fill();

            text(title, left + 14, y + 11, {
                size: 12,
                bold: true,
            });
        };

        const field = (
            label: string,
            value: string,
            x: number,
            y: number,
            valueWidth = 220,
        ) => {
            text(label, x, y, {
                size: 9,
                color: muted,
                width: valueWidth,
            });

            text(value, x, y + 15, {
                size: 10,
                bold: true,
                width: valueWidth,
            });
        };

        doc.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
        });

        doc.on("error", reject);

        doc.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        // =========================
        // HEADER
        // =========================

        doc.rect(0, 0, 595, 8).fillColor(blue).fill();

        text("SkillForge", left, 35, {
            size: 25,
            bold: true,
            color: navy,
        });

        text("LEARN  •  GROW  •  BUILD YOUR FUTURE", left, 72, {
            size: 8,
            color: muted,
        });

        doc
            .roundedRect(455, 42, 95, 27, 13)
            .fillColor("#D1FAE5")
            .fill();

        text("PAID", 455, 50, {
            size: 11,
            bold: true,
            color: green,
            width: 95,
        });

        line(98);

        // =========================
        // INVOICE HEADER
        // =========================

        text("Appointment Invoice", left, 116, {
            size: 23,
            bold: true,
        });

        text(
            "Payment receipt and appointment details",
            left,
            147,
            {
                size: 10,
                color: muted,
            },
        );

        field("INVOICE ID", data.invoiceId, left, 178);

        field(
            "INVOICE DATE",
            formatDate(new Date()),
            310,
            178,
        );

        line(222);

        // =========================
        // LEARNER INFORMATION
        // =========================

        section("LEARNER INFORMATION", 238, 103);

        field(
            "Full Name",
            data.learnerName,
            left + 14,
            282,
            225,
        );

        field(
            "Email Address",
            data.learnerEmail,
            310,
            282,
            225,
        );

        // =========================
        // MENTOR INFORMATION
        // =========================

        section("MENTOR INFORMATION", 356, 103);

        field(
            "Mentor Name",
            data.mentorName,
            left + 14,
            400,
            225,
        );

        field(
            "Area of Expertise",
            data.mentorExpertise || '',
            310,
            400,
            220,
        );

        // =========================
        // APPOINTMENT DETAILS
        // =========================

        section("APPOINTMENT DETAILS", 474, 150);

        field(
            "Appointment ID",
            data.appointmentId,
            left + 14,
            520,
        );

        field(
            "Serial Number",
            String(data.serialNumber),
            310,
            520,
        );

        field(
            "Schedule Date",
            formatDate(data.scheduleDate),
            left + 14,
            560,
        );

        field(
            "Joining Time",
            formatTime(data.joiningTime),
            310,
            560,
        );

        // Clickable meeting link
        text("Meeting Link", left + 14, 598, {
            size: 9,
            color: muted,
        });

        const meetingLink =
            /^https?:\/\//i.test(data.meetingLink)
                ? data.meetingLink
                : "";

        if (meetingLink) {
            doc
                .font("Helvetica-Bold")
                .fontSize(10)
                .fillColor(blue)
                .text("Join Meeting", left + 14, 613, {
                    width: 220,
                    link: meetingLink,
                    underline: true,
                });
        } else {
            text("Meeting link unavailable", left + 14, 613, {
                size: 10,
                color: muted,
            });
        }

        // =========================
        // PAYMENT DETAILS
        // =========================

        section("PAYMENT DETAILS", 638, 116);

        field(
            "Transaction ID",
            data.transactionId,
            left + 14,
            681,
            230,
        );

        field(
            "Payment Date",
            formatDateTime(data.paidAt),
            310,
            681,
            225,
        );

        text("TOTAL AMOUNT PAID", left + 14, 721, {
            size: 9,
            color: muted,
        });

        text(
            `BDT ${data.amount.toLocaleString("en-BD", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
            310,
            716,
            {
                size: 16,
                bold: true,
                color: green,
                width: 225,
            },
        );

        // =========================
        // THANK YOU SECTION
        // =========================

        doc
            .roundedRect(left, 772, width, 42, 8)
            .fillColor(light)
            .fill();

        text(
            "Thank you for choosing SkillForge!",
            left + 12,
            781,
            {
                size: 11,
                bold: true,
                width: width - 24,
            },
        );

        text(
            "We wish you success on your learning journey.",
            left + 12,
            798,
            {
                size: 9,
                color: muted,
                width: width - 24,
            },
        );

        // Footer
        line(830);

        text(
            "SkillForge • Computer-generated invoice",
            left,
            839,
            {
                size: 8,
                color: muted,
                width,
            },
        );

        doc.end();
    });
};
