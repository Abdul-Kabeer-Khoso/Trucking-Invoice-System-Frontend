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

  // Handle input change for entry fields
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
  };

  // Handle invoice data change (customer details)
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

  return (
    <div className="w-[40%] h-[100%] rounded-lg flex flex-wrap justify-between items-center">
      <InputField
        type="number"
        label="Invoice Number"
        value={invoiceData.invoiceNumber}
        onChange={(e) => handleInvoiceChange("invoiceNumber", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="Customer Name"
        value={invoiceData.customerName}
        onChange={(e) => handleInvoiceChange("customerName", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="Customer Contact"
        value={invoiceData.customerContact}
        onChange={(e) => handleInvoiceChange("customerContact", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="Customer Address"
        value={invoiceData.customerAddress}
        onChange={(e) => handleInvoiceChange("customerAddress", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="From"
        value={formData.from}
        onChange={(e) => handleEntryChange("from", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="To"
        value={formData.to}
        onChange={(e) => handleEntryChange("to", e.target.value)}
        disabled={isAddingEntry}
      />

      <InputField
        type="text"
        label="Vehicle No"
        value={formData.vehicleNo}
        onChange={(e) => handleEntryChange("vehicleNo", e.target.value)}
        disabled={isAddingEntry}
      />

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
