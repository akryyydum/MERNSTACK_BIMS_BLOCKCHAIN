import React, { useEffect, useState, useMemo } from 'react';
import { Table, Spin, Alert, Tag, Input, Button } from 'antd';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { FileTextOutlined, DollarOutlined, ThunderboltOutlined, CloudSyncOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ResidentNavbar from './ResidentNavbar';
import apiClient from '@/utils/apiClient';

// Resident blockchain network dashboard
// Shows:
// 1. Document requests (on-chain)
// 2. Financial transactions (on-chain)
// 3. Utility fee summary (garbage & streetlight) from existing resident payments endpoint (DB fallback)
// 4. Basic chain status (block height, peers)

const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';

const statusColor = (status) => {
	switch ((status || '').toLowerCase()) {
		case 'pending': return 'gold';
		case 'accepted': return 'blue';
		case 'declined': return 'red';
		case 'completed': return 'green';
		default: return 'default';
	}
};

export default function ResidentBlockchainNetwork() {
	const [loadingRequests, setLoadingRequests] = useState(false);
	const [loadingTxns, setLoadingTxns] = useState(false);
	const [loadingStatus, setLoadingStatus] = useState(false);
	const [loadingUtilities, setLoadingUtilities] = useState(false);

	const [requests, setRequests] = useState([]);
	const [transactions, setTransactions] = useState([]);
	const [chainStatus, setChainStatus] = useState(null);
	const [utilitySummary, setUtilitySummary] = useState(null);
	const [utilityRecords, setUtilityRecords] = useState([]);
	const [residentProfile, setResidentProfile] = useState(null);

	const [errorRequests, setErrorRequests] = useState(null);
	const [errorTxns, setErrorTxns] = useState(null);
	const [errorStatus, setErrorStatus] = useState(null);
	const [errorUtilities, setErrorUtilities] = useState(null);

	const [search, setSearch] = useState('');

	// ==== Utility normalization (match ResidentPayment.jsx) ====
	const toNumber = (value) => Number(value ?? 0);

	const ymKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

	const parseMonthToDueDate = (monthKey, fallback) => {
		if (typeof monthKey === 'string' && monthKey.includes('-')) {
			const [y, m] = monthKey.split('-').map(Number);
			if (!isNaN(y) && !isNaN(m)) return new Date(y, m, 0); // last day of month
		}
		if (fallback) {
			const d = new Date(fallback);
			if (!isNaN(d)) return d;
		}
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth() + 1, 0);
	};

	const formatMonthPeriod = (monthKey, fallbackDate) => {
		if (typeof monthKey === 'string' && monthKey.includes('-')) {
			const [y, m] = monthKey.split('-').map(Number);
			if (!isNaN(y) && !isNaN(m)) {
				return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' });
			}
		}
		if (fallbackDate) {
			const d = new Date(fallbackDate);
			if (!isNaN(d)) return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
		}
		return monthKey || 'N/A';
	};

	const computeStatus = (balance, dueDate) => {
		const normalizedBalance = Number(balance || 0);
		if (normalizedBalance <= 0) return 'paid';
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
		const sameMonth = due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth();
		if (due < today) return 'overdue';
		if (sameMonth) return 'pending';
		return 'upcoming';
	};

	const deriveTypeLabel = (type) => {
		const normalized = String(type || '').toLowerCase();
		if (normalized.includes('street')) return 'Streetlight Fee';
		return 'Garbage Fee';
	};

	const normalizeUtilityResponse = (payload) => {
		if (!payload) return [];
		const containers = [
			{ key: 'garbage', type: 'garbage' },
			{ key: 'garbagePayments', type: 'garbage' },
			{ key: 'streetlight', type: 'streetlight' },
			{ key: 'streetlightPayments', type: 'streetlight' },
			{ key: 'utilityPayments', type: null },
			{ key: 'gasPayments', type: null },
			{ key: 'records', type: null },
			{ key: 'data', type: null },
		];
		const merged = [];
		if (Array.isArray(payload)) return payload.slice();
		containers.forEach(({ key }) => {
			const v = payload?.[key];
			if (!v) return;
			if (Array.isArray(v)) merged.push(...v);
			else if (Array.isArray(v?.payments)) merged.push(...v.payments);
		});
		return merged;
	};

	const buildPaymentRecord = (raw) => {
		const typeLabel = deriveTypeLabel(raw.type);
		const monthKey = raw.month || raw.period || raw.billingMonth || (raw.dueDate ? ymKey(new Date(raw.dueDate).getFullYear(), new Date(raw.dueDate).getMonth() + 1) : undefined);
		const dueDate = parseMonthToDueDate(monthKey, raw.dueDate);
		const amount = toNumber(raw.totalCharge ?? raw.amount ?? raw.charge);
		const amountPaid = toNumber(raw.amountPaid);
		const balance = raw.balance !== undefined ? Math.max(toNumber(raw.balance), 0) : Math.max(amount - amountPaid, 0);
		const status = computeStatus(balance, dueDate);
		const latestPayment = Array.isArray(raw.payments) && raw.payments.length > 0 ? raw.payments[raw.payments.length - 1] : null;
		const paymentDateCandidate = raw.completedAt || raw.completedDate || latestPayment?.paidAt || raw.updatedAt || raw.transactionDate;
		return {
			id: raw._id || raw.id || `${typeLabel.toLowerCase().replace(/\s+/g, '-')}-${monthKey || Date.now()}`,
			description: `${typeLabel} — ${formatMonthPeriod(monthKey, raw.dueDate)}`,
			type: typeLabel,
			period: formatMonthPeriod(monthKey, raw.dueDate),
			amount,
			amountPaid,
			balance,
			dueDate: dueDate.toISOString(),
			paymentDate: paymentDateCandidate ? new Date(paymentDateCandidate).toISOString() : null,
			status,
			monthKey: monthKey || `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`,
		};
	};

	// Fetch resident profile first (for filtering)
	useEffect(() => {
		const loadProfile = async () => {
			try {
				const res = await apiClient.get('/api/resident/profile');
				const data = res.data;
				setResidentProfile(data);
			} catch (e) {
				console.error('Profile error', e);
			}
		};
		loadProfile();
	}, []);

	// Blockchain status
	useEffect(() => {
		const loadStatus = async () => {
			setLoadingStatus(true); setErrorStatus(null);
			try {
				const res = await apiClient.get('/api/blockchain/status');
				setChainStatus(res.data);
			} catch (e) { setErrorStatus(e.message); } finally { setLoadingStatus(false); }
		};
		loadStatus();
	}, []);

	// Requests from blockchain: fetch all, then scope to resident + exclude synthetic utility *_payment entries (match admin page logic)
	useEffect(() => {
		if (!residentProfile?._id) return; // wait until profile is loaded to filter correctly
		const loadRequests = async () => {
			setLoadingRequests(true); setErrorRequests(null);
			try {
				// Admin view uses /api/blockchain/requests; mirror that for consistent counts
				const res = await apiClient.get('/api/blockchain/requests');
				const all = res.data;
				const myId = residentProfile._id.toString();
				const filtered = (Array.isArray(all) ? all : []).filter(r => {
					const type = (r.documentType || '').toString().toLowerCase().trim();
					// Exclude any utility/fee related entries regardless of household status
					if (!type) return false;
					const excludedKeywords = ['garbage', 'street', 'streetlight', 'utility', 'fee', '_payment', 'payment'];
					if (excludedKeywords.some(k => type.includes(k))) return false;
					return (r.residentId || '').toString() === myId; // scope to this resident only
				});
				setRequests(filtered);
			} catch (e) { setErrorRequests(e.message); } finally { setLoadingRequests(false); }
		};
		loadRequests();
	}, [residentProfile?._id]);
	// Financial transactions from blockchain (resident + household head scoped via backend)
	useEffect(() => {
		const loadTxns = async () => {
			setLoadingTxns(true); setErrorTxns(null);
			try {
				const res = await apiClient.get('/api/blockchain/financial-transactions/me');
				const mine = res.data;
				setTransactions(Array.isArray(mine) ? mine : []);
			} catch (e) { setErrorTxns(e.message); } finally { setLoadingTxns(false); }
		};
		loadTxns();
	}, []);

	// Utility payments summary (garbage & streetlight) via existing resident payments endpoint (DB fallback)
	useEffect(() => {
		if (!residentProfile?._id) return;
		const loadUtilities = async () => {
			setLoadingUtilities(true); setErrorUtilities(null);
			try {
				const res = await apiClient.get('/api/resident/payments');
				const data = res.data;
				const flat = normalizeUtilityResponse(data);
				const records = flat.map(buildPaymentRecord);
				// Keep raw for debugging and derived for display
				setUtilitySummary(Array.isArray(data) ? data : flat);
				setUtilityRecords(records);
			} catch (e) { setErrorUtilities(e.message); } finally { setLoadingUtilities(false); }
		};
		loadUtilities();
	}, [residentProfile?._id]);

	const filteredRequests = useMemo(() => {
		const term = search.toLowerCase();
		return requests.filter(r => !term || [r.documentType, r.purpose, r.status].filter(Boolean).join(' ').toLowerCase().includes(term));
	}, [search, requests]);

	const filteredTxns = useMemo(() => {
		const term = search.toLowerCase();
		return transactions.filter(t => !term || [t.residentName, t.description, t.paymentMethod, t.amount]
			.filter(Boolean)
			.join(' ')
			.toLowerCase()
			.includes(term));
	}, [search, transactions]);

	const requestsColumns = [
		{ title: 'ID', dataIndex: 'requestId', width: 180, ellipsis: true },
		{ title: 'Type', dataIndex: 'documentType' },
		{ title: 'Purpose', dataIndex: 'purpose', ellipsis: true },
		{ title: 'Status', dataIndex: 'status', render: (s) => <Tag color={statusColor(s)}>{s}</Tag> },
		{ title: 'Requested At', dataIndex: 'requestedAt', render: v => v ? new Date(v).toLocaleString() : '-' },
		{ title: 'Updated At', dataIndex: 'updatedAt', render: v => v ? new Date(v).toLocaleString() : '-' },
	];

	const txnColumns = [
		{ title: 'Tx ID', dataIndex: 'txId', width: 180, ellipsis: true },
		{ title: 'Request', dataIndex: 'requestId', width: 180, ellipsis: true },
		{ title: 'Resident', dataIndex: 'residentName', render: v => <span className="whitespace-normal break-words max-w-[140px] sm:max-w-none">{v || '—'}</span> },
		{ title: 'Amount', dataIndex: 'amount', render: a => `₱${Number(a||0).toFixed(2)}` },
		{ title: 'Method', dataIndex: 'paymentMethod' },
		{ title: 'Description', dataIndex: 'description', ellipsis: true },
		{ title: 'Created', dataIndex: 'createdAt', render: v => v ? new Date(v).toLocaleString() : '-' },
		{ title: 'Updated', dataIndex: 'updatedAt', render: v => v ? new Date(v).toLocaleString() : '-' },
	];

	// Match ResidentPayment.jsx semantics using normalized records
	const garbageRecords = useMemo(() => utilityRecords.filter(r => r.type === 'Garbage Fee'), [utilityRecords]);
	const streetlightRecords = useMemo(() => utilityRecords.filter(r => r.type === 'Streetlight Fee'), [utilityRecords]);
	const totalGarbage = garbageRecords.length;
	const totalStreet = streetlightRecords.length;
	const totalPaidGarbage = garbageRecords.filter(r => r.status === 'paid').length;
	const totalPaidStreet = streetlightRecords.filter(r => r.status === 'paid').length;

	// On-chain verification: consider a txn verifies a month if same type keyword and same YYYY-MM
	const txnKey = (t) => {
		const created = t.createdAt || t.updatedAt || t.timestamp;
		const d = created ? new Date(created) : null;
		const ym = d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
		const desc = String(t.description || '').toLowerCase();
		const method = String(t.paymentMethod || '').toLowerCase();
		const hint = `${desc} ${method}`;
		const type = hint.includes('street') ? 'Streetlight Fee' : (hint.includes('garbage') ? 'Garbage Fee' : null);
		return type && ym ? `${type}|${ym}` : null;
	};
	const verifiedSet = useMemo(() => {
		const s = new Set();
		(transactions || []).forEach(t => {
			const k = txnKey(t);
			if (k) s.add(k);
		});
		return s;
	}, [transactions]);
	const verifiedPaidGarbage = garbageRecords.filter(r => r.status === 'paid' && verifiedSet.has(`${r.type}|${r.monthKey}`)).length;
	const verifiedPaidStreet = streetlightRecords.filter(r => r.status === 'paid' && verifiedSet.has(`${r.type}|${r.monthKey}`)).length;

	// ==== PDF Export Helpers ====
	const exportRequestsPDF = () => {
		try {
			const doc = new jsPDF();
			doc.setFontSize(14);
			doc.text('Document Requests', 14, 15);
			const headers = ['ID','Type','Purpose','Status','Requested At','Updated At'];
			const rows = (filteredRequests || []).map(r => [
				r.requestId || '-',
				r.documentType || '-',
				r.purpose || '-',
				r.status || '-',
				r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-',
				r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '-',
			]);
			doc.autoTable({ head: [headers], body: rows, startY: 20, styles: { fontSize: 8 } });
			doc.save('document_requests.pdf');
		} catch (e) {
			console.error('PDF export (requests) failed', e);
		}
	};

	const exportTransactionsPDF = () => {
		try {
			const doc = new jsPDF();
			doc.setFontSize(14);
			doc.text('Financial Transactions in Blockchain', 14, 15);
			const headers = ['Tx ID','Request','Resident','Amount','Method','Description','Created','Updated'];
			const rows = (filteredTxns || []).map(t => {
				const amount = Number(t.amount || 0);
				const formattedAmount = `P ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
				return [
					t.txId || '-',
					t.requestId || '-',
					t.residentName || '-',
					formattedAmount,
					t.paymentMethod || '-',
					t.description || '-',
					t.createdAt ? new Date(t.createdAt).toLocaleString() : '-',
					t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '-',
				];
			});
			doc.autoTable({ head: [headers], body: rows, startY: 20, styles: { fontSize: 8 } });
			doc.save('financial_transactions.pdf');
		} catch (e) {
			console.error('PDF export (transactions) failed', e);
		}
	};

		return (
			<div className="min-h-screen bg-slate-50">
				<ResidentNavbar />
				<main className="mx-auto w-full max-w-9xl space-y-4 px-3 py-4 sm:px-4 lg:px-6">
					<Card className="w-full border border-slate-200 shadow-md bg-gradient-to-r from-slate-50 via-white to-slate-50">
						<CardHeader className="pb-3">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
								<div className="flex-1">
									<CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
										Blockchain Activity
									</CardTitle>
									<CardDescription className="text-xs sm:text-sm text-slate-600">
										View your on-chain document requests, fee payments, and transactions
									</CardDescription>
								</div>
							</div>
						</CardHeader>
					</Card>

					<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
						<Card className="w-full lg:col-span-5 border border-slate-200 shadow-md bg-white">
							<CardHeader>
								<CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Overview</CardTitle>
								<CardDescription className="text-xs sm:text-sm text-slate-600">On-chain records and barangay utility fee status</CardDescription>
							</CardHeader>
							<CardContent className="pt-5">
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-2 sm:gap-4">
									<Card className="border border-blue-200 bg-blue-50 shadow-sm">
										<CardContent className="p-2 sm:p-4">
											<div className="flex items-center gap-2 sm:gap-3">
												<div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200">
													<FileTextOutlined className="text-blue-600 text-lg sm:text-xl" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">On-chain Requests</p>
													<p className="text-xl sm:text-3xl font-bold text-slate-800">{requests.length}</p>
													<p className="text-[10px] sm:text-xs text-slate-400">Total stored</p>
												</div>
											</div>
										</CardContent>
									</Card>
									<Card className="border border-green-200 bg-green-50 shadow-sm">
										<CardContent className="p-2 sm:p-4">
											<div className="flex items-center gap-2 sm:gap-3">
												<div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 border border-green-200">
													<DollarOutlined className="text-green-600 text-lg sm:text-xl" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5 sm:mb-1">Transactions</p>
													<p className="text-xl sm:text-3xl font-bold text-slate-800">{transactions.length}</p>
													<p className="text-[10px] sm:text-xs text-slate-400">Financial records</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</div>
							</CardContent>
						</Card>
						<Card className="w-full lg:col-span-7 border border-slate-200 shadow-md bg-white">
							<CardHeader>
								<CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-slate-800">Chain & Utility Status</CardTitle>
								<CardDescription className="text-xs sm:text-sm text-slate-600">Hyperledger Fabric network snapshot and utility fee summary</CardDescription>
							</CardHeader>
							<CardContent className="pt-5">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<Card className="border border-slate-200 shadow-sm">
										<CardHeader>
											<CardTitle className="text-sm font-semibold text-slate-800">Chain Status</CardTitle>
											<CardDescription className="text-xs text-slate-600">Fabric network</CardDescription>
										</CardHeader>
										<CardContent>
											{loadingStatus && (
												<div className="flex items-center gap-2 text-sm text-slate-600"><Spin size="small" /> Loading status...</div>
											)}
											{errorStatus && <Alert type="error" message={errorStatus} />}
											{!loadingStatus && chainStatus && (
												<div className="space-y-2 text-sm">
													<div className="flex justify-between"><span className="text-slate-600">Channel:</span><span className="font-medium text-slate-800">{chainStatus.channel}</span></div>
													<div className="flex justify-between"><span className="text-slate-600">Block Height:</span><span className="font-medium text-slate-800">{chainStatus.blockHeight ?? 'N/A'}</span></div>
													<div className="flex justify-between"><span className="text-slate-600">Peers:</span><span className="font-medium text-slate-800">{Array.isArray(chainStatus.peers) ? chainStatus.peers.map(p => p.name).join(', ') : 'N/A'}</span></div>
													<div className="flex justify-between"><span className="text-slate-600">Latency:</span><span className="font-medium text-slate-800">{chainStatus.latencyMs} ms</span></div>
												</div>
											)}
										</CardContent>
									</Card>
									<Card className="border border-slate-200 shadow-sm">
										<CardHeader>
											<CardTitle className="text-sm font-semibold text-slate-800">Garbage Fee Summary</CardTitle>
											<CardDescription className="text-xs text-slate-600">Monthly payment</CardDescription>
										</CardHeader>
										<CardContent>
											{loadingUtilities && <div className="flex items-center gap-2 text-sm text-slate-600"><Spin size="small" /> Loading...</div>}
											{errorUtilities && <Alert type="error" message={errorUtilities} />}
											{!loadingUtilities && Array.isArray(utilitySummary) ? (
												<div className="space-y-2 text-sm">
													<div className="flex justify-between"><span className="text-slate-600">Months Recorded:</span><span className="font-medium text-slate-800">{utilitySummary.filter(p => p.type === 'garbage').length}</span></div>
													<div className="flex justify-between"><span className="text-slate-600">Paid Months:</span><span className="font-medium text-slate-800">{totalPaidGarbage}</span></div>
												</div>
											) : (!loadingUtilities && <div className="text-sm text-slate-500">No data</div>)}
										</CardContent>
									</Card>
									<Card className="border border-slate-200 shadow-sm">
										<CardHeader>
											<CardTitle className="text-sm font-semibold text-slate-800">Streetlight Fee Summary</CardTitle>
											<CardDescription className="text-xs text-slate-600">Monthly payment</CardDescription>
										</CardHeader>
										<CardContent>
											{loadingUtilities && <div className="flex items-center gap-2 text-sm text-slate-600"><Spin size="small" /> Loading...</div>}
											{errorUtilities && <Alert type="error" message={errorUtilities} />}
											{!loadingUtilities && Array.isArray(utilitySummary) ? (
												<div className="space-y-2 text-sm">
													<div className="flex justify-between"><span className="text-slate-600">Months Recorded:</span><span className="font-medium text-slate-800">{utilitySummary.filter(p => p.type === 'streetlight').length}</span></div>
													<div className="flex justify-between"><span className="text-slate-600">Paid Months:</span><span className="font-medium text-slate-800">{totalPaidStreet}</span></div>
												</div>
											) : (!loadingUtilities && <div className="text-sm text-slate-500">No data</div>)}
										</CardContent>
									</Card>
								</div>
							</CardContent>
						</Card>
					</div>

					   <Card className="w-full border border-slate-200 shadow-md bg-white">
						<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<CardTitle className="text-base sm:text-lg font-semibold text-slate-900">On-chain Records</CardTitle>
								<CardDescription className="text-xs sm:text-sm">Document requests and financial transactions</CardDescription>
							</div>
							<div className="w-full sm:w-72">
								<Input allowClear size="small" className="h-9" prefix={<SearchOutlined />} placeholder="Search requests & transactions" value={search} onChange={e => setSearch(e.target.value)} />
							</div>
						</CardHeader>
						<CardContent className="space-y-10">
							<div className="space-y-4">
								<div className="flex items-center justify-between gap-2 flex-wrap">
									<h3 className="text-xs sm:text-sm font-semibold text-slate-800">Document Requests ({filteredRequests.length})</h3>
									<div className="flex items-center gap-2">
										<Button size="small" type="primary" onClick={exportRequestsPDF} disabled={loadingRequests || filteredRequests.length === 0}>Export PDF</Button>
										{loadingRequests && <Spin size="small" />}
									</div>
								</div>
								{errorRequests && <Alert type="error" message={errorRequests} style={{ marginBottom: 8 }} />}
								<div className="overflow-x-auto -mx-2 md:mx-0">
									<Table
										size="small"
										dataSource={filteredRequests}
										columns={requestsColumns}
										rowKey={r => r.requestId}
										pagination={{ pageSize: 8, size: 'small' }}
										scroll={{ x: 600 }}
									/>
								</div>
								{!loadingRequests && !errorRequests && filteredRequests.length === 0 && (
									<div className="flex items-center gap-2 text-xs text-slate-500"><ExclamationCircleOutlined /> No on-chain requests found.</div>
								)}
							</div>
							<div className="space-y-4">
								<div className="flex items-center justify-between gap-2 flex-wrap">
									<h3 className="text-xs sm:text-sm font-semibold text-slate-800">Financial Transactions ({filteredTxns.length})</h3>
									<div className="flex items-center gap-2">
										<Button size="small" type="primary" onClick={exportTransactionsPDF} disabled={loadingTxns || filteredTxns.length === 0}>Export PDF</Button>
										{loadingTxns && <Spin size="small" />}
									</div>
								</div>
								{errorTxns && <Alert type="error" message={errorTxns} style={{ marginBottom: 8 }} />}
								<div className="overflow-x-auto -mx-2 md:mx-0">
									<Table
										size="small"
										dataSource={filteredTxns}
										columns={txnColumns}
										rowKey={t => t.txId}
										pagination={{ pageSize: 8, size: 'small' }}
										scroll={{ x: 700 }}
									/>
								</div>
								{!loadingTxns && !errorTxns && filteredTxns.length === 0 && (
									<div className="flex items-center gap-2 text-xs text-slate-500"><ExclamationCircleOutlined /> No on-chain transactions found.</div>
								)}
							</div>
						   </CardContent>
					   </Card>
				   </main>
			   </div>
			   );
}

