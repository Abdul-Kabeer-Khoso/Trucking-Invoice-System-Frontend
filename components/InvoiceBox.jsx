import Button from "./Button";
import ExcelTable from "./ExcelTable";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const InvoiceBox = ({
  rows,
  selectedRowIndex,
  onSelectRow,
  onDeleteEntry,
  onRowsChange,
  onSaveInvoice,
  onNewInvoice,
  isAddingEntry = false,
  onInvoiceFound,
  currentInvoiceNumber = "",
}) => {
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showNormalTable, setShowNormalTable] = useState(true);
  const searchTimeoutRef = useRef(null);
  const previousSearchInvoiceNumberRef = useRef("");
  const isAddingEntryRef = useRef(false);

  // Sync ref with prop
  useEffect(() => {
    isAddingEntryRef.current = isAddingEntry;
  }, [isAddingEntry]);

  // Helper function to format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Helper function to convert display date back to ISO format
  const convertToISODate = (dateString) => {
    if (!dateString) return "";

    // If it's already in ISO format (YYYY-MM-DD), return as is
    if (dateString.includes("-") && dateString.length === 10) {
      return dateString;
    }

    // If it's in display format (DD/MM/YYYY), convert to ISO
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

  // Process incoming data - keep dates in ISO format for backend, but format for display
  const processInvoiceData = (invoiceData) => {
    if (!invoiceData) return invoiceData;

    // Create a copy with formatted dates for display
    const processedData = { ...invoiceData };

    if (processedData.entries) {
      processedData.entries = processedData.entries.map((entry) => ({
        ...entry,
        // Keep original dates in the data, but we'll format them in the table
        loadingDate: entry.loadingDate, // Keep as ISO for backend
        billDate: entry.billDate, // Keep as ISO for backend
      }));
    }

    return processedData;
  };

  // Calculate subtotal whenever rows change
  useEffect(() => {
    calculateSubTotal();
  }, [rows]);

  // Calculate total whenever subtotal or discount changes
  useEffect(() => {
    calculateTotal();
  }, [subTotal, discountPercent]);

  // Search invoice when searchInvoiceNumber changes (with debounce)
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const currentValue = searchInvoiceNumber.trim();
    const previousValue = previousSearchInvoiceNumberRef.current;

    // Update previous value
    previousSearchInvoiceNumberRef.current = currentValue;

    // If input is cleared, show normal table immediately
    if (!currentValue) {
      setShowNormalTable(true);
      setSearchError("");
      setIsLoading(false);
      return;
    }

    // If less than 1 character, show normal table
    if (currentValue.length < 1) {
      setShowNormalTable(true);
      setSearchError("");
      setIsLoading(false);
      return;
    }

    // Only search if the value actually changed to something valid
    if (currentValue.length >= 1 && currentValue !== previousValue) {
      // Hide normal table and show loading immediately
      setShowNormalTable(false);
      setIsLoading(true);
      setSearchError("");

      searchTimeoutRef.current = setTimeout(async () => {
        // Check if we're adding entries before proceeding
        if (isAddingEntryRef.current) {
          setIsLoading(false);
          setShowNormalTable(true);
          return;
        }

        try {
          const response = await axios.get(
            `http://localhost:5000/api/invoices/${currentValue}`,
          );

          if (response.data) {
            // Process the data (but keep dates in ISO format)
            const processedData = processInvoiceData(response.data);

            // Notify parent about found invoice
            if (onInvoiceFound) {
              onInvoiceFound(processedData);
            }

            if (processedData.entries && onRowsChange) {
              onRowsChange(processedData.entries);
            }

            setSearchError("");

            // Show success message
            if (processedData.invoiceNumber) {
              alert(
                `Invoice ${processedData.invoiceNumber} loaded successfully! You can now edit and save it.`,
              );
            }
          } else {
            setSearchError("No invoice found with this number");
            if (onRowsChange) {
              onRowsChange([]);
            }
          }
        } catch (error) {
          console.error("Error fetching invoice:", error);
          setSearchError(
            error.response?.data?.error ||
              "Error loading invoice. Please check the invoice number.",
          );
          if (onRowsChange) {
            onRowsChange([]);
          }
        } finally {
          setIsLoading(false);
        }
      }, 500);
    }

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInvoiceNumber, onRowsChange, onInvoiceFound]);

  // Calculate subtotal from all rows
  const calculateSubTotal = () => {
    if (!rows || rows.length === 0) {
      setSubTotal(0);
      return;
    }

    let totalSubTotal = 0;

    rows.forEach((row) => {
      const weight = parseFloat(row.weight) || 0;
      const chWeight = parseFloat(row.chWeight) || 0;
      const rate = parseFloat(row.rate) || 0;
      const freight = parseFloat(row.freight) || 0;

      let rowSubTotal = freight;

      if (chWeight > weight) {
        const extraWeight = chWeight - weight;
        const extraCharge = extraWeight * rate;
        rowSubTotal += extraCharge;
      }

      if (onRowsChange && row.subTotal !== rowSubTotal.toFixed(2)) {
        const updatedRows = rows.map((r, index) =>
          index === rows.indexOf(row)
            ? { ...r, subTotal: rowSubTotal.toFixed(2) }
            : r,
        );
        onRowsChange(updatedRows);
      }

      totalSubTotal += rowSubTotal;
    });

    setSubTotal(parseFloat(totalSubTotal.toFixed(2)));
  };

  // Calculate total with discount
  const calculateTotal = () => {
    const discountAmount = subTotal * (discountPercent / 100);
    const finalTotal = subTotal - discountAmount;
    setTotal(parseFloat(finalTotal.toFixed(2)));
  };

  // Handle discount input change
  const handleDiscountChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const percent = parseFloat(value) || 0;
      setDiscountPercent(percent > 100 ? 100 : percent);
    }
  };

  // Handle subtotal change manually
  const handleSubTotalChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setSubTotal(parseFloat(value) || 0);
    }
  };

  // Handle total change manually
  const handleTotalChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const newTotal = parseFloat(value) || 0;
      setTotal(newTotal);
      if (subTotal > 0) {
        const calculatedDiscount = ((subTotal - newTotal) / subTotal) * 100;
        setDiscountPercent(parseFloat(calculatedDiscount.toFixed(2)));
      }
    }
  };

  // Handle New Invoice button click
  const handleNewInvoice = () => {
    if (isAddingEntry) {
      alert("Please wait, entries are being added...");
      return;
    }

    setSearchInvoiceNumber("");
    setDiscountPercent(0);
    setSubTotal(0);
    setTotal(0);
    setSearchError("");
    setShowNormalTable(true);
    setIsLoading(false);
    previousSearchInvoiceNumberRef.current = "";

    if (onNewInvoice) {
      onNewInvoice();
    }

    alert("New invoice created. All fields cleared.");
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInvoiceNumber(value);
  };

  // Manual search button handler
  const handleManualSearch = async () => {
    if (isAddingEntry) {
      alert("Please wait, entries are being added...");
      return;
    }

    if (!searchInvoiceNumber.trim()) {
      alert("Please enter an invoice number to search");
      return;
    }

    setShowNormalTable(false);
    setIsLoading(true);
    setSearchError("");

    try {
      const response = await axios.get(
        `http://localhost:5000/api/invoices/${searchInvoiceNumber.trim()}`,
      );

      if (response.data) {
        // Process the data (keep dates in ISO format)
        const processedData = processInvoiceData(response.data);

        // Notify parent about found invoice
        if (onInvoiceFound) {
          onInvoiceFound(processedData);
        }

        if (processedData.entries && onRowsChange) {
          onRowsChange(processedData.entries);
        }

        setSearchError("");

        // Show success message
        if (processedData.invoiceNumber) {
          alert(
            `Invoice ${processedData.invoiceNumber} loaded successfully! You can now edit and save it.`,
          );
        }
      } else {
        setSearchError("No invoice found with this number");
        if (onRowsChange) {
          onRowsChange([]);
        }
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      setSearchError(
        error.response?.data?.error ||
          "Error loading invoice. Please check the invoice number.",
      );
      if (onRowsChange) {
        onRowsChange([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render the main content area
  const renderMainContent = () => {
    // Show normal ExcelTable when showNormalTable is true
    if (showNormalTable) {
      return (
        <ExcelTable
          rows={rows}
          selectedRowIndex={selectedRowIndex}
          onSelectRow={onSelectRow}
          onRowsChange={onRowsChange}
        />
      );
    }

    // Show loading state
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <i className="fa-solid fa-spinner fa-spin fa-2x text-blue-500 mb-2"></i>
            <p className="text-gray-600">Searching for invoice...</p>
            <p className="text-sm text-gray-500 mt-2">
              Searching for:{" "}
              <span className="font-semibold">{searchInvoiceNumber}</span>
            </p>
          </div>
        </div>
      );
    }

    // Show error state
    if (searchError) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-center">
            <i className="fa-solid fa-exclamation-circle fa-2x text-red-500 mb-2"></i>
            <p className="text-red-600 font-medium">{searchError}</p>
            <p className="text-sm text-gray-500 mt-2">
              Invoice number:{" "}
              <span className="font-semibold">{searchInvoiceNumber}</span>
            </p>
            <button
              onClick={handleManualSearch}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isAddingEntry}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // If no rows after search
    if (rows.length === 0) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="text-center text-gray-500">
            <i className="fa-solid fa-file-invoice fa-2x mb-2"></i>
            <p>No entries found for this invoice</p>
            <p className="text-sm mt-2">
              Invoice number:{" "}
              <span className="font-semibold">{searchInvoiceNumber}</span>
            </p>
          </div>
        </div>
      );
    }

    // Show ExcelTable with data
    return (
      <ExcelTable
        rows={rows}
        selectedRowIndex={selectedRowIndex}
        onSelectRow={onSelectRow}
        onRowsChange={onRowsChange}
      />
    );
  };

  return (
    <div className="w-[58%] h-full border border-gray-500 rounded-lg flex-col pt-3 px-2">
      {/* Top controls */}
      <div className="w-full flex justify-between items-center">
        <Button
          name="New Invoice"
          styling="bg-green-500"
          onClick={handleNewInvoice}
          disabled={isAddingEntry}
        />

        <div className="relative w-[80%] flex justify-center">
          <i
            className="fa-solid fa-magnifying-glass fa-lg absolute left-17 top-4"
            style={{ color: "#979797" }}
          ></i>
          <input
            type="text"
            placeholder="Search existing invoice by number"
            className="w-[80%] py-1 pl-10 pr-2 rounded-2xl border-1 border-gray-500 focus:outline-blue-400"
            value={searchInvoiceNumber}
            onChange={handleSearchChange}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleManualSearch();
              }
            }}
            disabled={isAddingEntry}
          />
          {isAddingEntry && (
            <div className="absolute right-20 top-2">
              <i
                className="fa-solid fa-circle-notch fa-spin text-blue-500"
                title="Adding entries..."
              ></i>
            </div>
          )}
          {isLoading && (
            <i className="fa-solid fa-spinner fa-spin absolute right-20 top-4 text-blue-500"></i>
          )}
          {searchError && !isLoading && (
            <div className="absolute right-20 top-2">
              <i
                className="fa-solid fa-exclamation-circle text-red-500"
                title={searchError}
              ></i>
            </div>
          )}
          {!showNormalTable &&
            !isLoading &&
            !searchError &&
            rows.length > 0 && (
              <div className="absolute right-20 top-2">
                <i
                  className="fa-solid fa-check-circle text-green-500"
                  title="Invoice found"
                ></i>
              </div>
            )}
        </div>
      </div>

      {/* Excel Table Area */}
      <div className="h-[67%] my-5">{renderMainContent()}</div>

      {/* Subtotal / Total / Discount section */}
      <div className="w-[100%] flex justify-between items-center">
        <div className="w-[50%] flex flex-col justify-center items-center">
          <div className="w-full flex justify-between items-center mb-2">
            <p className="w-[30%]">Subtotal: </p>
            <input
              type="text"
              value={subTotal}
              onChange={handleSubTotalChange}
              className="w-[65%] p-1 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
              disabled={isAddingEntry}
            />
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <p className="w-[30%]">Discount %: </p>
            <input
              type="text"
              value={discountPercent}
              onChange={handleDiscountChange}
              placeholder="0"
              className="w-[65%] p-1 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
              disabled={isAddingEntry}
            />
          </div>
          <div className="w-full flex justify-between items-center mb-2">
            <p className="w-[30%] font-bold">Total: </p>
            <input
              type="text"
              value={total}
              onChange={handleTotalChange}
              className="w-[65%] p-1 rounded-sm border-1 border-gray-400 font-bold focus:outline-blue-500"
              disabled={isAddingEntry}
            />
          </div>
        </div>

        <div className="w-[40%] flex flex-col justify-between items-center">
          <Button
            name={isAddingEntry ? "Adding Entry..." : "Save Invoice"}
            styling="bg-green-500 mb-2 w-[70%]"
            icon="fa-solid fa-file fa-sm"
            onClick={onSaveInvoice}
            disabled={isAddingEntry}
          />
          <Button
            name="Export Excel"
            styling="bg-orange-400 mb-2 w-[70%]"
            icon="fa-solid fa-arrow-down fa-sm"
            onClick={async () => {
              if (isAddingEntry) {
                alert("Please wait, entries are being added...");
                return;
              }

              try {
                const response = await fetch(
                  "http://localhost:5000/api/invoices/export-excel",
                  {
                    method: "GET",
                  },
                );

                if (!response.ok) {
                  const text = await response.text();
                  throw new Error(text || "Failed to fetch Excel file");
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement("a");
                a.href = url;
                a.download = "invoices.xlsx";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
                alert("Error downloading Excel file: " + err.message);
              }
            }}
            disabled={isAddingEntry}
          />
          <Button
            name="Export PDF"
            styling="bg-orange-400 w-[70%]"
            icon="fa-solid fa-arrow-down fa-sm"
            onClick={() => {
              if (isAddingEntry) {
                alert("Please wait, entries are being added...");
                return;
              }

              if (!currentInvoiceNumber.trim()) {
                alert(
                  "Please enter an invoice number in the Invoice Number field",
                );
                return;
              }
              window.open(
                `http://localhost:5000/api/invoices/${currentInvoiceNumber}/pdf`,
                "_blank",
              );
            }}
            disabled={isAddingEntry}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceBox;
