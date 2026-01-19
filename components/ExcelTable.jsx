import { useState } from "react";

const columns = [
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "vehicleNo", label: "Vehicle No" },
  { key: "challanNo", label: "Challan No" },
  { key: "weight", label: "Weight" },
  { key: "rate", label: "Rate" },
  { key: "freight", label: "Freight" },
  { key: "whCharges", label: "Wh Charges" },
  { key: "loadingCharges", label: "Loading Charges" },
  { key: "loadingDate", label: "Loading Date" },
  { key: "billDate", label: "Bill Date" },
];

// Helper function to format date for display (DD/MM/YYYY)
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";

  try {
    // If it's already in display format (DD/MM/YYYY), return as is
    if (dateString.includes("/") && dateString.length === 10) {
      return dateString;
    }

    // If it's in ISO format (YYYY-MM-DD), convert to display format
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    }

    // Try to parse as Date object
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return dateString;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// Helper function to convert display date back to ISO format (YYYY-MM-DD)
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

  // Try to parse as Date object
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error("Error converting date to ISO:", error);
  }

  return dateString;
};

const ExcelTable = ({ rows, selectedRowIndex, onSelectRow, onRowsChange }) => {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const columnWidth = "180px";

  // Toggle row selection
  const toggleRowSelection = (rowIndex) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowIndex)) {
      newSelectedRows.delete(rowIndex);
    } else {
      newSelectedRows.add(rowIndex);
    }
    setSelectedRows(newSelectedRows);

    // If single row selection is needed, keep this
    if (onSelectRow) onSelectRow(rowIndex);
  };

  // Select all rows
  const selectAllRows = () => {
    if (selectedRows.size === rows.length) {
      // Deselect all if all are selected
      setSelectedRows(new Set());
    } else {
      // Select all
      const allRowIndices = new Set(rows.map((_, index) => index));
      setSelectedRows(allRowIndices);
    }
  };

  // Handle row click for selection
  const handleRowClick = (rowIndex, e) => {
    // Check if click was on checkbox
    if (e.target.type === "checkbox") {
      e.stopPropagation();
      return;
    }

    toggleRowSelection(rowIndex);
  };

  const handleChange = (rowIndex, key, value) => {
    const updatedRows = [...rows];

    // If it's a date field, convert display format to ISO for storage
    if (key === "loadingDate" || key === "billDate") {
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        [key]: convertToISODate(value),
      };
    } else {
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [key]: value };
    }

    // Auto-calculate freight if weight or rate changes
    if (key === "weight" || key === "rate") {
      const w = Number(updatedRows[rowIndex].weight || 0);
      const r = Number(updatedRows[rowIndex].rate || 0);
      updatedRows[rowIndex].freight = (w * r).toFixed(2);
    }

    // Send updated rows to parent
    if (onRowsChange) onRowsChange(updatedRows);
  };

  // Function to delete selected rows (to be called from parent)
  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;

    // Filter out selected rows
    const updatedRows = rows.filter((_, index) => !selectedRows.has(index));

    // Clear selection
    setSelectedRows(new Set());

    // Send updated rows to parent
    if (onRowsChange) onRowsChange(updatedRows);

    return updatedRows;
  };

  return (
    <div className="w-full h-full overflow-x-auto border border-gray-400">
      {/* Multi-select controls */}
      <div className="flex justify-between items-center p-2 bg-gray-100 border-b">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={rows.length > 0 && selectedRows.size === rows.length}
              onChange={selectAllRows}
              className="mr-2"
            />
            <span className="text-sm">
              {selectedRows.size > 0
                ? `${selectedRows.size} row${selectedRows.size > 1 ? "s" : ""} selected`
                : "Select rows to delete"}
            </span>
          </div>
        </div>
        {selectedRows.size > 0 && (
          <button
            onClick={() => {
              const updatedRows = deleteSelectedRows();
              // You can call a parent function here if needed
            }}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
          >
            Delete Selected ({selectedRows.size})
          </button>
        )}
      </div>

      <table
        className="border-collapse text-sm table-fixed w-full"
        style={{ minWidth: `${columns.length * 180}px` }}
      >
        <thead>
          <tr className="bg-gray-200">
            {/* Checkbox column */}
            <th className="border border-gray-300 px-2 py-1 text-center w-12">
              <input
                type="checkbox"
                checked={rows.length > 0 && selectedRows.size === rows.length}
                onChange={selectAllRows}
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="border border-gray-300 px-2 py-1 text-left"
                style={{ width: columnWidth }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-4 text-gray-400"
              >
                No entries added yet
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  selectedRows.has(rowIndex)
                    ? "bg-blue-100"
                    : selectedRowIndex === rowIndex
                      ? "bg-blue-50"
                      : ""
                }
                onClick={(e) => handleRowClick(rowIndex, e)}
              >
                {/* Checkbox cell */}
                <td className="border border-gray-300 p-0 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => toggleRowSelection(rowIndex)}
                    className="mx-auto"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {columns.map((col) => {
                  // Get the display value for this cell
                  let displayValue = row[col.key] || "";

                  // Format date columns for display
                  if (col.key === "loadingDate" || col.key === "billDate") {
                    displayValue = formatDateForDisplay(displayValue);
                  }

                  // Format numeric values to 2 decimal places
                  if (
                    col.key === "freight" ||
                    col.key === "whCharges" ||
                    col.key === "loadingCharges"
                  ) {
                    if (displayValue && !isNaN(parseFloat(displayValue))) {
                      displayValue = parseFloat(displayValue).toFixed(2);
                    }
                  }

                  return (
                    <td key={col.key} className="border border-gray-300 p-0">
                      <input
                        type={
                          col.key === "weight" ||
                          col.key === "rate" ||
                          col.key === "freight" ||
                          col.key === "whCharges" ||
                          col.key === "loadingCharges"
                            ? "number"
                            : "text"
                        }
                        value={displayValue}
                        onChange={(e) =>
                          handleChange(rowIndex, col.key, e.target.value)
                        }
                        className="w-full px-2 py-1 outline-none focus:bg-blue-50"
                        style={{ minWidth: columnWidth }}
                        onClick={(e) => e.stopPropagation()}
                        step={
                          col.key === "weight" ||
                          col.key === "rate" ||
                          col.key === "freight" ||
                          col.key === "whCharges" ||
                          col.key === "loadingCharges"
                            ? "0.01"
                            : undefined
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExcelTable;
