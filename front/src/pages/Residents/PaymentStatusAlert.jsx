import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, DollarSign } from 'lucide-react';

const PaymentStatusAlert = ({ paymentStatus, onPaymentClick, className = "" }) => {
  if (!paymentStatus) return null;

  const { canRequestDocuments, paymentStatus: status } = paymentStatus;

  if (canRequestDocuments) {
    return (
      <Card className={`w-full bg-emerald-50 shadow-sm ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-emerald-900 mb-1">
                All payments are up to date
              </h4>
              <p className="text-sm text-emerald-700">
                You can proceed to request documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalOutstanding = status.totalOutstanding || 0;
  const garbageFee = status.garbageFee || {};
  const streetlightFee = status.streetlightFee || {};

  return (
    <Card className={`w-full bg-rose-50 shadow-sm ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900 mb-1">
              Outstanding Payments Required
            </h4>
            <p className="text-sm text-rose-700">
              You have unpaid fees that must be settled before you can request documents.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Garbage Fee Status */}
          <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    <h5 className="text-sm font-semibold text-slate-800">Garbage Fee</h5>
                  </div>
                  <p className="text-xs text-slate-500">Current Month</p>
                </div>
                <div className="text-right">
                  {Number(garbageFee.balance || 0) > 0 && (
                    <div className="text-base font-bold text-slate-900 mb-1">
                      ₱{Number(garbageFee.balance || 0).toFixed(2)}
                    </div>
                  )}
                  <span 
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      garbageFee.paid 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : garbageFee.status === 'partial' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {garbageFee.paid ? 'PAID' : (garbageFee.status || 'UNPAID').toUpperCase()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streetlight Fee Status */}
          <Card className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-sky-500" />
                    <h5 className="text-sm font-semibold text-slate-800">Streetlight Fee</h5>
                  </div>
                  <p className="text-xs text-slate-500">Current Month</p>
                </div>
                <div className="text-right">
                  {Number(streetlightFee.balance || 0) > 0 && (
                    <div className="text-base font-bold text-slate-900 mb-1">
                      ₱{Number(streetlightFee.balance || 0).toFixed(2)}
                    </div>
                  )}
                  <span 
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      streetlightFee.paid 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : streetlightFee.status === 'partial' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {streetlightFee.paid ? 'PAID' : (streetlightFee.status || 'UNPAID').toUpperCase()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusAlert;