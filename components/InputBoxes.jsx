import { useState, useEffect } from "react";
import Button from "./Button";
import InputField from "./InputField";
import axios from "axios";

const InputBoxes = ({
  onAddEntry,
  isAddingEntry = false,
  invoiceData = {
    invoiceNumber: "",
    customerName: "",
    customerContact: "",
    customerAddress: "",
  },
  onInvoiceDataChange,
}) => {
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    from: "",
    to: "",
    vehicleNo: "",
    challanNo: "",
    chWeight: "",
    weight: "",
    rate: "",
    freight: "",
    weighingCharges: "",
    loadingCharges: "",
    loadingDate: formatDate(new Date()),
    billDate: formatDate(new Date()),
  });

  const [isFreightManuallyChanged, setIsFreightManuallyChanged] =
    useState(false);

  // State for autocomplete suggestions
  const [suggestions, setSuggestions] = useState({
    customerName: [],
    customerContact: [],
    customerAddress: [],
    from: [],
    to: [],
    vehicleNo: [],
  });

  const [showSuggestions, setShowSuggestions] = useState({
    customerName: false,
    customerContact: false,
    customerAddress: false,
    from: false,
    to: false,
    vehicleNo: false,
  });

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState({
    customerName: -1,
    customerContact: -1,
    customerAddress: -1,
    from: -1,
    to: -1,
    vehicleNo: -1,
  });

  // Function to fetch autocomplete suggestions
  const fetchSuggestions = async (field, value) => {
    try {
      const url = value.trim()
        ? `http://localhost:5000/api/invoices/suggestions/${field}?search=${value}`
        : `http://localhost:5000/api/invoices/suggestions/${field}`;

      const response = await axios.get(url);
      if (response.data.success && Array.isArray(response.data.suggestions)) {
        setSuggestions((prev) => ({
          ...prev,
          [field]: response.data.suggestions.filter(
            (suggestion) => suggestion && suggestion.trim() !== "",
          ),
        }));
      } else {
        setSuggestions((prev) => ({
          ...prev,
          [field]: [],
        }));
      }
    } catch (error) {
      console.error(`Error fetching suggestions for ${field}:`, error);
      setSuggestions((prev) => ({
        ...prev,
        [field]: [],
      }));
    }
  };

  // Fetch initial suggestions on component mount
  useEffect(() => {
    // Fetch most frequently used values for each field
    const fetchInitialSuggestions = async () => {
      const fields = [
        "customerName",
        "customerContact",
        "customerAddress",
        "from",
        "to",
        "vehicleNo",
      ];
      for (const field of fields) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/invoices/suggestions/${field}?limit=10`,
          );
          if (
            response.data.success &&
            Array.isArray(response.data.suggestions)
          ) {
            setSuggestions((prev) => ({
              ...prev,
              [field]: response.data.suggestions.filter(
                (suggestion) => suggestion && suggestion.trim() !== "",
              ),
            }));
          }
        } catch (error) {
          console.error(
            `Error fetching initial suggestions for ${field}:`,
            error,
          );
          setSuggestions((prev) => ({
            ...prev,
            [field]: [],
          }));
        }
      }
    };

    fetchInitialSuggestions();
  }, []);

  // Function to get preview invoice number from backend (doesn't increment)
  const getPreviewInvoiceNumber = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/invoices/preview-next-number",
      );
      return response.data.previewInvoiceNumber;
    } catch (error) {
      console.error("Error getting preview invoice number:", error);
      // Fallback
      const currentNum = parseInt(invoiceData.invoiceNumber) || 3099;
      return (currentNum + 1).toString();
    }
  };

  // Function to get next invoice number from backend (increments - only use on save)
  const getNextInvoiceNumber = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/invoices/next-number",
      );
      return response.data.nextInvoiceNumber;
    } catch (error) {
      console.error("Error getting next invoice number:", error);
      const currentNum = parseInt(invoiceData.invoiceNumber) || 3099;
      return (currentNum + 1).toString();
    }
  };

  // Auto-generate PREVIEW invoice number on component mount if empty
  useEffect(() => {
    const generatePreviewInvoiceNumber = async () => {
      if (!invoiceData.invoiceNumber.trim()) {
        const previewNumber = await getPreviewInvoiceNumber();
        if (onInvoiceDataChange) {
          onInvoiceDataChange("invoiceNumber", previewNumber.toString());
        }
      }
    };

    generatePreviewInvoiceNumber();
  }, []); // Empty dependency array - run once on mount

  // Handle invoice data changes (from parent/props)
  useEffect(() => {
    // If invoiceData changes from parent (e.g., after search), we don't need to update local state
  }, [invoiceData]);

  // Handle input change for entry fields with autocomplete
  const handleEntryChange = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };

      // Auto-calculate freight when weight or rate changes
      if ((key === "weight" || key === "rate") && !isFreightManuallyChanged) {
        const w = Number(updated.weight || 0);
        const r = Number(updated.rate || 0);
        updated.freight = (w * r).toFixed(2);
      }

      // If user manually changes freight, mark it as manually changed
      if (key === "freight") {
        setIsFreightManuallyChanged(true);
      }

      return updated;
    });

    // Fetch suggestions for autocomplete fields
    if (["from", "to", "vehicleNo"].includes(key)) {
      fetchSuggestions(key, value);
      setShowSuggestions((prev) => ({ ...prev, [key]: true }));
      setActiveSuggestionIndex((prev) => ({ ...prev, [key]: -1 }));
    }
  };

  // Handle invoice data change (customer details) with autocomplete
  const handleInvoiceChange = async (field, value) => {
    if (field === "invoiceNumber") {
      // If user clears the field, get preview number (doesn't increment)
      if (!value.trim()) {
        const previewNumber = await getPreviewInvoiceNumber();
        value = previewNumber.toString();
      }
    }

    if (onInvoiceDataChange) {
      onInvoiceDataChange(field, value);
    }

    // Fetch suggestions for autocomplete fields
    if (
      ["customerName", "customerContact", "customerAddress"].includes(field)
    ) {
      fetchSuggestions(field, value);
      setShowSuggestions((prev) => ({ ...prev, [field]: true }));
      setActiveSuggestionIndex((prev) => ({ ...prev, [field]: -1 }));
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (field, e) => {
    if (!showSuggestions[field] || suggestions[field].length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => ({
        ...prev,
        [field]: Math.min(prev[field] + 1, suggestions[field].length - 1),
      }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => ({
        ...prev,
        [field]: Math.max(prev[field] - 1, -1),
      }));
    } else if (e.key === "Enter" && activeSuggestionIndex[field] >= 0) {
      e.preventDefault();
      const selectedValue = suggestions[field][activeSuggestionIndex[field]];
      if (
        ["customerName", "customerContact", "customerAddress"].includes(field)
      ) {
        handleInvoiceChange(field, selectedValue);
      } else {
        setFormData((prev) => ({ ...prev, [field]: selectedValue }));
      }
      setShowSuggestions((prev) => ({ ...prev, [field]: false }));
    } else if (e.key === "Escape") {
      setShowSuggestions((prev) => ({ ...prev, [field]: false }));
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (field, value) => {
    if (
      ["customerName", "customerContact", "customerAddress"].includes(field)
    ) {
      handleInvoiceChange(field, value);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    setShowSuggestions((prev) => ({ ...prev, [field]: false }));
  };

  // Reset freight auto-calculation when weight or rate are cleared
  useEffect(() => {
    if ((!formData.weight || !formData.rate) && isFreightManuallyChanged) {
      setIsFreightManuallyChanged(false);
    }
  }, [formData.weight, formData.rate, isFreightManuallyChanged]);

  // Clear entry fields only (not invoice data)
  const handleClearFields = () => {
    setFormData({
      from: "",
      to: "",
      vehicleNo: "",
      challanNo: "",
      chWeight: "",
      weight: "",
      rate: "",
      freight: "",
      weighingCharges: "",
      loadingCharges: "",
      loadingDate: formatDate(new Date()),
      billDate: formatDate(new Date()),
    });
    setIsFreightManuallyChanged(false);
  };

  // Recalculate freight button handler
  const handleRecalculateFreight = () => {
    const w = Number(formData.weight || 0);
    const r = Number(formData.rate || 0);
    const calculatedFreight = (w * r).toFixed(2);

    setFormData((prev) => ({
      ...prev,
      freight: calculatedFreight,
    }));
    setIsFreightManuallyChanged(false);
  };

  // Add Entry
  const handleAddEntry = async () => {
    // Don't allow adding if already in process
    if (isAddingEntry) {
      alert("Please wait, previous entry is being processed...");
      return;
    }

    // Validate required fields
    if (!invoiceData.invoiceNumber) {
      alert("Please enter an Invoice Number first");
      return;
    }

    if (!invoiceData.customerName) {
      alert("Please enter Customer Name first");
      return;
    }

    const entryData = {
      from: formData.from,
      to: formData.to,
      vehicleNo: formData.vehicleNo,
      challanNo: formData.challanNo,
      chWeight: formData.chWeight,
      weight: formData.weight,
      rate: formData.rate,
      freight: formData.freight,
      whCharges: formData.weighingCharges,
      loadingCharges: formData.loadingCharges,
      loadingDate: formData.loadingDate,
      billDate: formData.billDate,
    };

    if (onAddEntry) {
      onAddEntry(entryData);
    }

    // Clear only entry fields
    setFormData({
      from: "",
      to: "",
      vehicleNo: "",
      challanNo: "",
      chWeight: "",
      weight: "",
      rate: "",
      freight: "",
      weighingCharges: "",
      loadingCharges: "",
      loadingDate: formatDate(new Date()),
      billDate: formatDate(new Date()),
    });

    // Reset manual flag for next entry
    setIsFreightManuallyChanged(false);
  };

  // Render autocomplete suggestions
  const renderSuggestions = (field) => {
    if (
      !showSuggestions[field] ||
      !suggestions[field] ||
      suggestions[field].length === 0
    ) {
      return null;
    }

    return (
      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {suggestions[field].map((suggestion, index) => (
          <div
            key={index}
            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
              index === activeSuggestionIndex[field] ? "bg-blue-100" : ""
            }`}
            onClick={() => handleSuggestionClick(field, suggestion)}
          >
            {suggestion}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-[40%] h-[100%] rounded-lg flex flex-wrap justify-between items-center">
      <InputField
        type="number"
        label="Invoice Number"
        value={invoiceData.invoiceNumber}
        onChange={(e) => handleInvoiceChange("invoiceNumber", e.target.value)}
        disabled={isAddingEntry}
      />

      {/* Customer Name with autocomplete */}
      <div className="w-[47%] flex flex-col relative ">
        <input
          type="text"
          value={invoiceData.customerName}
          onChange={(e) => handleInvoiceChange("customerName", e.target.value)}
          onFocus={() =>
            setShowSuggestions((prev) => ({ ...prev, customerName: true }))
          }
          onBlur={() =>
            setTimeout(
              () =>
                setShowSuggestions((prev) => ({
                  ...prev,
                  customerName: false,
                })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("customerName", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="Customer Name"
          disabled={isAddingEntry}
        />
        {renderSuggestions("customerName")}
      </div>

      {/* Customer Contact with autocomplete */}
      <div className="w-[47%] flex flex-col relative mb-2 mt-1 ">
        <input
          type="text"
          value={invoiceData.customerContact}
          onChange={(e) =>
            handleInvoiceChange("customerContact", e.target.value)
          }
          onFocus={() =>
            setShowSuggestions((prev) => ({ ...prev, customerContact: true }))
          }
          onBlur={() =>
            setTimeout(
              () =>
                setShowSuggestions((prev) => ({
                  ...prev,
                  customerContact: false,
                })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("customerContact", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="Customer Contact"
          disabled={isAddingEntry}
        />
        {renderSuggestions("customerContact")}
      </div>

      {/* Customer Address with autocomplete */}
      <div className="w-[47%] flex flex-col relative mb-2 mt-1 ml-1">
        <input
          type="text"
          value={invoiceData.customerAddress}
          onChange={(e) =>
            handleInvoiceChange("customerAddress", e.target.value)
          }
          onFocus={() =>
            setShowSuggestions((prev) => ({ ...prev, customerAddress: true }))
          }
          onBlur={() =>
            setTimeout(
              () =>
                setShowSuggestions((prev) => ({
                  ...prev,
                  customerAddress: false,
                })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("customerAddress", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="Customer Address"
          disabled={isAddingEntry}
        />
        {renderSuggestions("customerAddress")}
      </div>

      {/* From with autocomplete */}
      <div className="w-[47%] flex flex-col relative mb-2">
        <input
          type="text"
          value={formData.from}
          onChange={(e) => handleEntryChange("from", e.target.value)}
          onFocus={() =>
            setShowSuggestions((prev) => ({ ...prev, from: true }))
          }
          onBlur={() =>
            setTimeout(
              () => setShowSuggestions((prev) => ({ ...prev, from: false })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("from", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="From"
          disabled={isAddingEntry}
        />
        {renderSuggestions("from")}
      </div>

      {/* To with autocomplete */}
      <div className="w-[47%] flex flex-col relative mb-1">
        <input
          type="text"
          value={formData.to}
          onChange={(e) => handleEntryChange("to", e.target.value)}
          onFocus={() => setShowSuggestions((prev) => ({ ...prev, to: true }))}
          onBlur={() =>
            setTimeout(
              () => setShowSuggestions((prev) => ({ ...prev, to: false })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("to", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="To"
          disabled={isAddingEntry}
        />
        {renderSuggestions("to")}
      </div>

      {/* Vehicle No with autocomplete */}
      <div className="w-[48%] flex flex-col relative mb-1">
        <input
          type="text"
          value={formData.vehicleNo}
          onChange={(e) => handleEntryChange("vehicleNo", e.target.value)}
          onFocus={() =>
            setShowSuggestions((prev) => ({ ...prev, vehicleNo: true }))
          }
          onBlur={() =>
            setTimeout(
              () =>
                setShowSuggestions((prev) => ({ ...prev, vehicleNo: false })),
              200,
            )
          }
          onKeyDown={(e) => handleKeyDown("vehicleNo", e)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="Enter Vehicle No"
          disabled={isAddingEntry}
        />
        {renderSuggestions("vehicleNo")}
      </div>

      <InputField
        type="text"
        label="Challan No"
        value={formData.challanNo}
        onChange={(e) => handleEntryChange("challanNo", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="number"
        label="Challan Weight"
        value={formData.chWeight}
        onChange={(e) => handleEntryChange("chWeight", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="number"
        label="Weight"
        value={formData.weight}
        onChange={(e) => handleEntryChange("weight", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="number"
        label="Rate"
        value={formData.rate}
        onChange={(e) => handleEntryChange("rate", e.target.value)}
        disabled={isAddingEntry}
      />

      {/* Freight field with manual edit capability */}
      <div className="w-[47%] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          {isFreightManuallyChanged && (
            <button
              type="button"
              onClick={handleRecalculateFreight}
              className="text-xs text-blue-600 hover:text-blue-800"
              title="Recalculate from Weight × Rate"
              disabled={isAddingEntry}
            >
              Auto-calc
            </button>
          )}
        </div>
        <input
          type="number"
          value={formData.freight}
          onChange={(e) => handleEntryChange("freight", e.target.value)}
          className="w-full p-2 rounded-sm border-1 border-gray-400 focus:outline-blue-500"
          placeholder="Freight"
          disabled={isAddingEntry}
        />
        {isFreightManuallyChanged && (
          <p className="mt-1 text-xs text-gray-500">
            Manual override (normally:{" "}
            {Number(formData.weight || 0) * Number(formData.rate || 0)})
          </p>
        )}
      </div>

      <InputField
        type="number"
        label="Weighing Charges"
        value={formData.weighingCharges}
        onChange={(e) => handleEntryChange("weighingCharges", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="number"
        label="Loading Charges"
        value={formData.loadingCharges}
        onChange={(e) => handleEntryChange("loadingCharges", e.target.value)}
        disabled={isAddingEntry}
      />

      {/* Loading Date with label */}
      <div className="w-[48%] flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">
          Loading Date
        </label>
        <input
          type="date"
          value={formData.loadingDate}
          onChange={(e) => handleEntryChange("loadingDate", e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isAddingEntry}
        />
      </div>

      {/* Billing Date with label */}
      <div className="w-[48%] flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">
          Billing Date
        </label>
        <input
          type="date"
          value={formData.billDate}
          onChange={(e) => handleEntryChange("billDate", e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isAddingEntry}
        />
      </div>

      <div className="w-[50%] flex justify-between items-center mt-2">
        <Button
          name={isAddingEntry ? "Adding..." : "Add Entry"}
          bgColor={"#0647af"}
          onClick={handleAddEntry}
          disabled={isAddingEntry}
        />
        <Button
          name="Clear Fields"
          bgColor={"#a50b0b"}
          onClick={handleClearFields}
          disabled={isAddingEntry}
        />
      </div>
    </div>
  );
};

export default InputBoxes;
