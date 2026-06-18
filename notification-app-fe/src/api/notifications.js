const DEFAULT_FEED_URL = import.meta.env.VITE_NOTIFICATION_API_URL || '/api/notifications';
const DEFAULT_PRIORITY_URL = import.meta.env.VITE_PRIORITY_API_URL || 'http://4.224.186.213/evaluation-service/notifications';
const DEFAULT_PRIORITY_TOKEN = import.meta.env.VITE_PRIORITY_API_TOKEN || '';

function toQueryString(params) {
	const query = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			query.set(key, String(value));
		}
	});

	return query.toString();
}

async function parseResponse(response) {
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new Error('Forbidden');
		}

		const fallback = `${response.status} ${response.statusText}`;
		throw new Error(fallback);
	}

	return response.json();
}

function extractNotifications(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload.notifications)) {
		return payload.notifications;
	}

	return [];
}

export async function fetchNotifications({ studentId = 1042, unreadOnly = false, apiUrl = DEFAULT_FEED_URL } = {}) {
	const queryString = toQueryString({ studentId, unreadOnly: unreadOnly ? 'true' : undefined });
	const response = await fetch(`${apiUrl}?${queryString}`);
	const payload = await parseResponse(response);
	return {
		notifications: extractNotifications(payload),
		total: payload.total ?? extractNotifications(payload).length,
		page: payload.page ?? 1,
		limit: payload.limit ?? extractNotifications(payload).length,
		totalPages: payload.totalPages ?? 1,
	};
}

export async function fetchPriorityNotifications({
	apiUrl = DEFAULT_PRIORITY_URL,
	token = DEFAULT_PRIORITY_TOKEN,
	limit = 10,
	page = 1,
	notificationType,
} = {}) {
	const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
	const queryString = toQueryString({ limit, page, notification_type: notificationType });
	const response = await fetch(`${apiUrl}${queryString ? `?${queryString}` : ''}`, { headers });
	const payload = await parseResponse(response);
	return {
		notifications: extractNotifications(payload),
		total: payload.total ?? extractNotifications(payload).length,
		page: payload.page ?? page,
		limit: payload.limit ?? limit,
		totalPages: payload.totalPages ?? 1,
	};
}

