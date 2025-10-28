interface InvoiceEmailProps {
    invoiceNumber: string;
    teamName: string;
    totalAmount: string;
    dueDate: string;
    downloadUrl?: string;
    viewUrl: string;
}
export declare function InvoiceEmail({ invoiceNumber, teamName, totalAmount, dueDate, downloadUrl, viewUrl, }: InvoiceEmailProps): import("react/jsx-runtime").JSX.Element;
export default InvoiceEmail;
//# sourceMappingURL=InvoiceEmail.d.ts.map