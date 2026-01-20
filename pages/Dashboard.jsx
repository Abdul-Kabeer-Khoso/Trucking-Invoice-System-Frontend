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
  const [customerName, setCustomerName] = useState(""); // Added this
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(""); // Added this

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
      setCustomerName(""); // Clear customer name
      setCurrentInvoiceNumber(nextInvoiceNumber); // Set current invoice number
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
      setCustomerName(""); // Clear customer name
      setCurrentInvoiceNumber(nextNumber); // Set current invoice number

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
  const handleSaveInvoice = async (discountData) => {
    try {
      console.log("Saving invoice with discount data:", discountData);

      // Prepare invoice data with discount
      const invoiceDataToSave = {
        invoiceNumber: currentInvoiceNumber || invoiceData.invoiceNumber,
        customerName: customerName || invoiceData.customerName,
        customerContact: invoiceData.customerContact,
        customerAddress: invoiceData.customerAddress,
        entries: rows.map((row) => ({
          ...row,
          // Make sure to convert dates to ISO format
          loadingDate: row.loadingDate
            ? new Date(row.loadingDate).toISOString()
            : null,
        })),
        discountPercent: discountData?.discountPercent || 0,
        subTotal: discountData?.subTotal || 0,
        totalAmount: discountData?.total || 0,
      };

      console.log("Invoice data to save:", invoiceDataToSave);

      // Send to backend
      const response = await axios.post(
        "http://localhost:5000/api/invoices/save",
        invoiceDataToSave,
      );

      console.log("Invoice saved successfully:", response.data);
      alert("Invoice saved successfully!");

      // Clear form or do other actions
      handleNewInvoice(); // Create new invoice after saving
    } catch (error) {
      console.error("Error saving invoice:", error);
      alert(
        "Error saving invoice: " +
          (error.response?.data?.error || error.message),
      );
    }
  };

  // Handle invoice data update from InputBoxes
  const handleInvoiceDataChange = (field, value) => {
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Update customerName separately if needed
    if (field === "customerName") {
      setCustomerName(value);
    }
  };

  // Handle when invoice is found from search
  const handleInvoiceFound = (foundInvoiceData) => {
    // Set rows from invoice entries
    setRows(foundInvoiceData.entries || []);

    // Set invoice number
    setCurrentInvoiceNumber(foundInvoiceData.invoiceNumber || "");

    // Update invoiceData state
    setInvoiceData({
      invoiceNumber: foundInvoiceData.invoiceNumber || "",
      customerName: foundInvoiceData.customerName || "",
      customerContact: foundInvoiceData.customerContact || "",
      customerAddress: foundInvoiceData.customerAddress || "",
    });

    // Set customer name separately
    if (foundInvoiceData.customerName) {
      setCustomerName(foundInvoiceData.customerName);
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
          onSelectRow={setSelectedRowIndex} // Fixed: using setSelectedRowIndex directly
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
