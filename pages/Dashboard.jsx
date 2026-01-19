import InputBoxes from "../components/InputBoxes";
import InvoiceBox from "../components/InvoiceBox";
import { useState } from "react";
import axios from "axios";

const Dashboard = () => {
  const [rows, setRows] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "",
    customerName: "",
    customerContact: "",
    customerAddress: "",
  });

  // Helper function to convert display date (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
  const convertToISODate = (dateString) => {
    if (!dateString) return "";

    // If it's already in ISO format or empty, return as is
    if (dateString.includes("-") && dateString.length === 10) {
      return dateString;
    }

    // Try to parse DD/MM/YYYY format
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    // If we can't parse it, return the original
    return dateString;
  };

  // Add entry ONLY to frontend table
  const handleAddEntry = (entry) => {
    setIsAddingEntry(true);

    // Add the entry to rows
    setRows((prev) => [...prev, entry]);
    setSelectedRowIndex(null);

    // Reset the flag immediately after state update
    setTimeout(() => {
      setIsAddingEntry(false);
    }, 50);
  };

  // Handle new invoice - FIXED: Fetch next invoice number from backend
  // const handleNewInvoice = async () => {
  //   try {
  //     // Get next invoice number from backend
  //     const response = await axios.get(
  //       "http://localhost:5000/api/invoices/next-number",
  //     );
  //     const nextInvoiceNumber = response.data.nextInvoiceNumber;

  //     setRows([]);
  //     setSelectedRowIndex(null);
  //     setIsAddingEntry(false);
  //     setInvoiceData({
  //       invoiceNumber: nextInvoiceNumber, // Auto-fill with next number
  //       customerName: "",
  //       customerContact: "",
  //       customerAddress: "",
  //     });

  //     alert(`New invoice created. Invoice number: ${nextInvoiceNumber}`);
  //   } catch (error) {
  //     console.error("Error getting next invoice number:", error);
  //     // Fallback: increment manually
  //     const currentNum = parseInt(invoiceData.invoiceNumber) || 3099;
  //     const nextNumber = (currentNum + 1).toString();

  //     setRows([]);
  //     setSelectedRowIndex(null);
  //     setIsAddingEntry(false);
  //     setInvoiceData({
  //       invoiceNumber: nextNumber,
  //       customerName: "",
  //       customerContact: "",
  //       customerAddress: "",
  //     });

  //     alert(`New invoice created. Invoice number: ${nextNumber}`);
  //   }
  // };

  // Handle new invoice - Show preview but don't increment counter
  // Handle new invoice - Increments invoice number
  const handleNewInvoice = async () => {
    try {
      // Get NEXT invoice number (increments counter)
      const response = await axios.get(
        "http://localhost:5000/api/invoices/next-number",
      );
      const nextInvoiceNumber = response.data.nextInvoiceNumber;

      setRows([]);
      setSelectedRowIndex(null);
      setIsAddingEntry(false);
      setInvoiceData({
        invoiceNumber: nextInvoiceNumber, // Use the incremented number
        customerName: "",
        customerContact: "",
        customerAddress: "",
      });
    } catch (error) {
      console.error("Error getting next invoice number:", error);
      // Fallback: increment manually
      const currentNum = parseInt(invoiceData.invoiceNumber) || 3099;
      const nextNumber = (currentNum + 1).toString();

      setRows([]);
      setSelectedRowIndex(null);
      setIsAddingEntry(false);
      setInvoiceData({
        invoiceNumber: nextNumber,
        customerName: "",
        customerContact: "",
        customerAddress: "",
      });

      alert(`New invoice created. Invoice number: ${nextNumber}`);
    }
  };

  // Delete selected row ONLY from frontend table
  const handleDeleteEntry = () => {
    if (selectedRowIndex === null) {
      alert("Please select a row first");
      return;
    }

    setRows((prev) => prev.filter((_, index) => index !== selectedRowIndex));
    setSelectedRowIndex(null);
  };

  // Handle updates in ExcelTable inputs
  const handleRowsChange = (updatedRows) => {
    setRows(updatedRows);
  };

  // Handle save invoice
  const handleSaveInvoice = async () => {
    if (!rows.length) {
      alert("No entries to save!");
      return;
    }

    if (!invoiceData.invoiceNumber || !invoiceData.customerName) {
      alert("Invoice Number and Customer Name are required!");
      return;
    }

    try {
      // Convert dates to ISO format before sending to backend
      const entriesWithISODates = rows.map((entry) => ({
        ...entry,
        loadingDate: convertToISODate(entry.loadingDate),
        billDate: convertToISODate(entry.billDate),
      }));

      const res = await axios.post("http://localhost:5000/api/invoices/save", {
        invoiceNumber: invoiceData.invoiceNumber,
        customerName: invoiceData.customerName,
        customerContact: invoiceData.customerContact,
        customerAddress: invoiceData.customerAddress,
        entries: entriesWithISODates,
      });

      if (res.data.success) {
        // IMPORTANT: Update invoice number if backend generated a new one
        if (res.data.invoice && res.data.invoice.invoiceNumber) {
          setInvoiceData((prev) => ({
            ...prev,
            invoiceNumber: res.data.invoice.invoiceNumber,
          }));
        }

        alert(res.data.message || "Invoice saved successfully!");
      } else {
        alert("Error saving invoice: " + (res.data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert(
        "Error saving invoice: " + (err.response?.data?.error || err.message),
      );
    }
  };

  // Handle invoice data update from InputBoxes
  const handleInvoiceDataChange = (field, value) => {
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle when invoice is found from search
  const handleInvoiceFound = (foundInvoice) => {
    setInvoiceData({
      invoiceNumber: foundInvoice.invoiceNumber || "",
      customerName: foundInvoice.customerName || "",
      customerContact: foundInvoice.customerContact || "",
      customerAddress: foundInvoice.customerAddress || "",
    });

    if (foundInvoice.entries) {
      setRows(foundInvoice.entries);
    }
  };

  return (
    <div className="w-full h-[100vh] bg-[#F6F0D7] flex justify-center items-center">
      <div className="w-full h-full bg-white rounded-xl border border-gray-300 flex justify-between items-center px-5 py-2">
        <InputBoxes
          onAddEntry={handleAddEntry}
          isAddingEntry={isAddingEntry}
          invoiceData={invoiceData}
          onInvoiceDataChange={handleInvoiceDataChange}
        />

        <InvoiceBox
          rows={rows}
          selectedRowIndex={selectedRowIndex}
          onSelectRow={setSelectedRowIndex}
          onDeleteEntry={handleDeleteEntry}
          onRowsChange={handleRowsChange}
          onSaveInvoice={handleSaveInvoice}
          onNewInvoice={handleNewInvoice}
          isAddingEntry={isAddingEntry}
          onInvoiceFound={handleInvoiceFound}
          currentInvoiceNumber={invoiceData.invoiceNumber}
        />
      </div>
    </div>
  );
};

export default Dashboard;
