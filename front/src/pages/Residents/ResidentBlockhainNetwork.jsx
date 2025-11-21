import React, { useEffect, useState, useMemo } from 'react';
import { Table, Spin, Alert, Tag, Input } from 'antd';
import { FileTextOutlined, DollarOutlined, ThunderboltOutlined, CloudSyncOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ResidentNavbar from './ResidentNavbar';

// Resident blockchain network dashboard
// Shows:
// 1. Document requests (on-chain)
// 2. Financial transactions (on-chain)
// 3. Utility fee summary (garbage & streetlight) from existing resident payments endpoint (DB fallback)
// 4. Basic chain status (block height, peers)

const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';

const authHeaders = () => ({
	Authorization: `Bearer ${localStorage.getItem('token')}`,
});

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
				const res = await fetch(`${API_BASE}/api/resident/profile`, { headers: authHeaders() });
				if (!res.ok) throw new Error(`Profile load failed (${res.status})`);
				const data = await res.json();
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
				const res = await fetch(`${API_BASE}/api/blockchain/status`, { headers: authHeaders() });
				if (!res.ok) throw new Error(`Status failed (${res.status})`);
				setChainStatus(await res.json());
			} catch (e) { setErrorStatus(e.message); } finally { setLoadingStatus(false); }
		};
		loadStatus();
	}, []);

	// Requests from blockchain (resident scoped only)
	useEffect(() => {
		const loadRequests = async () => {
			setLoadingRequests(true); setErrorRequests(null);
			try {
				const res = await fetch(`${API_BASE}/api/blockchain/requests/me`, { headers: authHeaders() });
				if (!res.ok) throw new Error(`Requests failed (${res.status})`);
				const mine = await res.json();
				setRequests(Array.isArray(mine) ? mine : []);
			} catch (e) { setErrorRequests(e.message); } finally { setLoadingRequests(false); }
		};
		loadRequests();
	}, []);
	// Financial transactions from blockchain (resident + household head scoped via backend)
	useEffect(() => {
		const loadTxns = async () => {
			setLoadingTxns(true); setErrorTxns(null);
			try {
				const res = await fetch(`${API_BASE}/api/blockchain/financial-transactions/me`, { headers: authHeaders() });
				if (!res.ok) throw new Error(`Transactions failed (${res.status})`);
				const mine = await res.json();
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
				const res = await fetch(`${API_BASE}/api/resident/payments`, { headers: authHeaders() });
				if (!res.ok) throw new Error(`Utilities failed (${res.status})`);
				const data = await res.json();
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
		{ title: 'Resident', dataIndex: 'residentName', ellipsis: true, render: v => v || '—' },
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

		return (
				<div className="min-h-screen bg-slate-50">
					<ResidentNavbar />
					{/* Main content wrapper with improved max width & responsive spacing */}
					<main className="mx-auto w-full max-w-screen-xl space-y-8 px-3 sm:px-4 md:px-6 lg:px-8 py-5">
					{/* Page header */}
						<Card className="w-full">
						<CardHeader>
								<CardTitle className="text-xl sm:text-2xl font-semibold text-slate-900">Blockchain Activity</CardTitle>
								<CardDescription className="text-xs sm:text-sm">View your on-chain document requests, fee payments, and transactions</CardDescription>
						</CardHeader>
					</Card>

						{/* Summary cards grid */}
						<Card className="w-full">
						<CardHeader>
								<CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Overview</CardTitle>
								<CardDescription className="text-xs sm:text-sm">On-chain records and barangay utility fee status</CardDescription>
						</CardHeader>
						<CardContent>
								<div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
								{/* Requests count */}
									<Card className="w-full border border-blue-200 bg-blue-50 shadow-sm">
									<CardContent className="space-y-3 px-3 py-4 md:px-4 md:py-6">
										<div className="flex items-center justify-between">
											<div className="flex-1">
													<p className="text-[11px] xs:text-xs md:text-sm font-medium text-blue-700">On-chain Requests</p>
													<p className="text-base sm:text-lg md:text-xl font-bold text-blue-900 mt-0.5 md:mt-1">{requests.length}</p>
												<p className="text-[10px] md:text-xs text-blue-600 mt-0.5 md:mt-1">Total stored</p>
											</div>
												<div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
													<FileTextOutlined className="text-blue-600 text-xs sm:text-sm md:text-lg" />
											</div>
										</div>
									</CardContent>
								</Card>
								{/* Transactions count */}
									<Card className="w-full border border-green-200 bg-green-50 shadow-sm">
									<CardContent className="space-y-3 px-3 py-4 md:px-4 md:py-6">
										<div className="flex items-center justify-between">
											<div className="flex-1">
													<p className="text-[11px] xs:text-xs md:text-sm font-medium text-green-700">Transactions</p>
													<p className="text-base sm:text-lg md:text-xl font-bold text-green-900 mt-0.5 md:mt-1">{transactions.length}</p>
												<p className="text-[10px] md:text-xs text-green-600 mt-0.5 md:mt-1">Financial records</p>
											</div>
												<div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
													<DollarOutlined className="text-green-600 text-xs sm:text-sm md:text-lg" />
											</div>
										</div>
									</CardContent>
								</Card>
								{/* Garbage fee */}
									<Card className="w-full border border-amber-200 bg-amber-50 shadow-sm">
									<CardContent className="space-y-3 px-3 py-4 md:px-4 md:py-6">
										<div className="flex items-center justify-between">
											<div className="flex-1">
													<p className="text-[11px] xs:text-xs md:text-sm font-medium text-amber-700">Garbage Paid Months</p>
													<p className="text-base sm:text-lg md:text-xl font-bold text-amber-900 mt-0.5 md:mt-1">{totalPaidGarbage}</p>
												<p className="text-[10px] md:text-xs text-amber-600 mt-0.5 md:mt-1">Verified on-chain: {verifiedPaidGarbage}/{totalPaidGarbage}</p>
											</div>
												<div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
													<CloudSyncOutlined className="text-amber-600 text-xs sm:text-sm md:text-lg" />
											</div>
										</div>
										<div className="text-[10px] md:text-xs text-amber-700">Months Recorded: {totalGarbage}</div>
									</CardContent>
								</Card>
								{/* Streetlight fee */}
									<Card className="w-full border border-purple-200 bg-purple-50 shadow-sm">
									<CardContent className="space-y-3 px-3 py-4 md:px-4 md:py-6">
										<div className="flex items-center justify-between">
											<div className="flex-1">
													<p className="text-[11px] xs:text-xs md:text-sm font-medium text-purple-700">Streetlight Paid Months</p>
													<p className="text-base sm:text-lg md:text-xl font-bold text-purple-900 mt-0.5 md:mt-1">{totalPaidStreet}</p>
												<p className="text-[10px] md:text-xs text-purple-600 mt-0.5 md:mt-1">Verified on-chain: {verifiedPaidStreet}/{totalPaidStreet}</p>
											</div>
												<div className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
													<ThunderboltOutlined className="text-purple-600 text-xs sm:text-sm md:text-lg" />
											</div>
										</div>
										<div className="text-[10px] md:text-xs text-purple-700">Months Recorded: {totalStreet}</div>
									</CardContent>
								</Card>
							</div>
						</CardContent>
					</Card>

					{/* Chain & Utility Status */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
						{/* Chain status */}
						<Card className="w-full">
							<CardHeader>
								<CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Chain Status</CardTitle>
								<CardDescription className="text-xs sm:text-sm">Hyperledger Fabric network snapshot</CardDescription>
							</CardHeader>
							<CardContent className="py-4">
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

						{/* Garbage fee summary */}
							<Card className="w-full">
								<CardHeader>
									<CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Garbage Fee Summary</CardTitle>
									<CardDescription className="text-xs sm:text-sm">Monthly payment tracking</CardDescription>
								</CardHeader>
								<CardContent className="py-4">
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

						{/* Streetlight fee summary */}
							<Card className="w-full">
								<CardHeader>
									<CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Streetlight Fee Summary</CardTitle>
									<CardDescription className="text-xs sm:text-sm">Monthly payment tracking</CardDescription>
								</CardHeader>
								<CardContent className="py-4">
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

					{/* Search + tables */}
					<Card className="w-full">
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
							{/* Requests table */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-xs sm:text-sm font-semibold text-slate-800">Document Requests, Garbage and Streetlight Transactions ({filteredRequests.length})</h3>
									{loadingRequests && <Spin size="small" />}
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
							{/* Transactions table */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-xs sm:text-sm font-semibold text-slate-800">Financial Transactions ({filteredTxns.length})</h3>
									{loadingTxns && <Spin size="small" />}
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

