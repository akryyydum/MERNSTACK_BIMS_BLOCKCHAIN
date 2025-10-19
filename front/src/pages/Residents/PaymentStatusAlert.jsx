import React from 'react';
import { Alert, Card, Tag, Button } from 'antd';
import { ExclamationCircleOutlined, DollarCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const PaymentStatusAlert = ({ paymentStatus, onPaymentClick, className = "" }) => {
  if (!paymentStatus) return null;

  const { canRequestDocuments, paymentStatus: status } = paymentStatus;

  if (canRequestDocuments) {
    return (
      <Alert
        message="✅ All payments are up to date"
        description="You can proceed to request documents"
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
        className={className}
      />
    );
  }

  const totalOutstanding = status.totalOutstanding || 0;
  const garbageFee = status.garbageFee || {};
  const streetlightFee = status.streetlightFee || {};

  return (
    <Alert
      message="Outstanding Payments Required"
      description={
        <div className="space-y-3">
          <p className="text-sm">
            You have unpaid fees that must be settled before you can request documents.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Garbage Fee Status */}
            <Card size="small" className="border-l-4 border-l-orange-400">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Garbage Fee</div>
                  <div className="text-xs text-gray-500">Current Month</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">₱{Number(garbageFee.balance || 0).toFixed(2)}</div>
                  <Tag color={garbageFee.paid ? 'green' : garbageFee.status === 'partial' ? 'orange' : 'red'} size="small">
                    {garbageFee.paid ? 'PAID' : (garbageFee.status || 'UNPAID').toUpperCase()}
                  </Tag>
                </div>
              </div>
            </Card>

            {/* Streetlight Fee Status */}
            <Card size="small" className="border-l-4 border-l-blue-400">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Streetlight Fee</div>
                  <div className="text-xs text-gray-500">Current Month</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">₱{Number(streetlightFee.balance || 0).toFixed(2)}</div>
                  <Tag color={streetlightFee.paid ? 'green' : streetlightFee.status === 'partial' ? 'orange' : 'red'} size="small">
                    {streetlightFee.paid ? 'PAID' : (streetlightFee.status || 'UNPAID').toUpperCase()}
                  </Tag>
                </div>
              </div>
            </Card>
          </div>
        </div>
      }
      type="warning"
      icon={<ExclamationCircleOutlined />}
      showIcon
      className={className}
    />
  );
};

export default PaymentStatusAlert;