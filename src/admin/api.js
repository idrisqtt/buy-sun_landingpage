// Requests to the cabinet API. The session is an httpOnly cookie the page
// cannot read; the custom header proves the request comes from this page.
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export async function api(method, url, body) {
  let response
  try {
    response = await fetch(`/api/admin${url}`, {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'buysun-admin',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Нет связи с сервером. Проверьте интернет.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.fields?.[0]?.message || data?.error || `Ошибка ${response.status}`
    throw new ApiError(response.status, message, data?.fields)
  }
  return data
}

export const fileUrl = (leadId, fileId, download = false) =>
  `/api/admin/leads/${leadId}/files/${fileId}${download ? '?download=1' : ''}`
