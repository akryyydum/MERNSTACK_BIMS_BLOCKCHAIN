import React, { useState } from "react";
import { Modal, Select, DatePicker, Button, message, Space } from "antd";
import { DownloadOutlined, CalendarOutlined } from "@ant-design/icons";
import apiClient from "../utils/apiClient";
import dayjs from "dayjs";

const { Option } = Select;

/**
 * ExportSummaryModal Component
 * 
 * Modal dialog for exporting barangay summary data as Excel (.xlsx)
 * with flexible date range filtering (day, week, month, year)
 * 
 * @param {boolean} visible - Control modal visibility
 * @param {function} onClose - Callback when modal is closed
 */
const ExportSummaryModal = ({ visible, onClose }) => {
  const [filterType, setFilterType] = useState("month");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);

  /**
   * Handle date change from DatePicker
   */
  const handleDateChange = (date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  /**
   * Handle filter type change
   * Reset date to current when type changes
   */
  const handleTypeChange = (value) => {
    setFilterType(value);
    setSelectedDate(dayjs()); // Reset to current date
  };

  /**
   * Handle CSV download submission
   */
  const handleDownload = async () => {
    try {
      setLoading(true);

      // Validate inputs
      if (!filterType) {
        message.error("Please select a filter type");
        return;
      }

      if (!selectedDate) {
        message.error("Please select a date");
        return;
      }

      // Format date as ISO string
      const dateValue = selectedDate.toISOString();

      console.log("[Export Excel] Request:", { type: filterType, date: dateValue });

      // Make API request with responseType 'blob' for file download
      const response = await apiClient.get("/api/export/summary-csv", {
        params: {
          type: filterType,
          date: dateValue,
        },
        responseType: "blob", // Important for downloading files
      });

      // Create blob from response with Excel MIME type
      const blob = new Blob([response.data], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = dayjs().format("YYYYMMDD_HHmmss");
      const filename = `bims_summary_${filterType}_${timestamp}.xlsx`;
      link.setAttribute("download", filename);

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success(`Excel file exported successfully: ${filename}`);
      
      // Close modal after successful download
      onClose();

    } catch (error) {
      console.error("[Export Excel] Error:", error);
      
      if (error.response?.status === 403) {
        message.error("Access denied. Admin privileges required.");
      } else if (error.response?.status === 400) {
        message.error("Invalid request parameters");
      } else {
        message.error("Failed to export Excel file. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!loading) {
      // Reset form
      setFilterType("month");
      setSelectedDate(dayjs());
      onClose();
    }
  };

  /**
   * Get DatePicker picker mode based on filter type
   */
  const getPickerMode = () => {
    switch (filterType) {
      case "week":
        return "week";
      case "month":
        return "month";
      case "year":
        return "year";
      case "day":
      default:
        return undefined; // Default is day picker
    }
  };

  /**
   * Get format string for date display
   */
  const getDateFormat = () => {
    switch (filterType) {
      case "week":
        return "YYYY-wo"; // Year and week number
      case "month":
        return "YYYY-MM";
      case "year":
        return "YYYY";
      case "day":
      default:
        return "YYYY-MM-DD";
    }
  };

  /**
   * Get helper text based on selected type
   */
  const getHelperText = () => {
    const formattedDate = selectedDate.format(getDateFormat());
    
    switch (filterType) {
      case "day":
        return `Export data for ${selectedDate.format("MMMM D, YYYY")}`;
      case "week":
        return `Export data for week ${selectedDate.week()} of ${selectedDate.year()}`;
      case "month":
        return `Export data for ${selectedDate.format("MMMM YYYY")}`;
      case "year":
        return `Export data for year ${selectedDate.year()}`;
      default:
        return "Select a date range to export";
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <DownloadOutlined className="text-blue-600" />
          <span className="font-bold">Export Summary CSV</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
      maskClosable={!loading}
      keyboard={!loading}
    >
      <div className="space-y-4 py-4">
        {/* Description */}
        <p className="text-sm text-gray-600">
          Export comprehensive barangay data summary for a specific date range.
          Select a filter type and date to generate your CSV report.
        </p>

        {/* Filter Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter Type
          </label>
          <Select
            value={filterType}
            onChange={handleTypeChange}
            className="w-full"
            size="large"
            disabled={loading}
          >
            <Option value="day">
              <Space>
                <CalendarOutlined />
                <span>Day</span>
              </Space>
            </Option>
            <Option value="week">
              <Space>
                <CalendarOutlined />
                <span>Week</span>
              </Space>
            </Option>
            <Option value="month">
              <Space>
                <CalendarOutlined />
                <span>Month</span>
              </Space>
            </Option>
            <Option value="year">
              <Space>
                <CalendarOutlined />
                <span>Year</span>
              </Space>
            </Option>
          </Select>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <DatePicker
            value={selectedDate}
            onChange={handleDateChange}
            picker={getPickerMode()}
            format={getDateFormat()}
            className="w-full"
            size="large"
            disabled={loading}
            allowClear={false}
          />
        </div>

        {/* Helper Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <CalendarOutlined className="mt-0.5" />
            <span>{getHelperText()}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <Button
            onClick={handleClose}
            disabled={loading}
            size="large"
          >
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            loading={loading}
            size="large"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Generating..." : "Download CSV"}
          </Button>
        </div>

        {/* Info Section */}
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-gray-500">
            <strong>CSV includes:</strong> Population demographics, household data, 
            fee collections, financial transactions, document requests, and blockchain records.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ExportSummaryModal;
