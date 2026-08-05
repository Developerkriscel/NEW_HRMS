import { NextResponse } from 'next/server'

// Mirrors the old Spring Boot `ApiResponse<T>` envelope so the frontend
// service layer barely has to change: { success, message, data, timestamp, errorCode }
export function ok(data, message = 'Success', status = 200) {
  return NextResponse.json(
    { success: true, message, data, timestamp: new Date().toISOString(), errorCode: null },
    { status }
  )
}

export function fail(message, status = 400, errorCode = null, data = null) {
  return NextResponse.json(
    { success: false, message, data, timestamp: new Date().toISOString(), errorCode },
    { status }
  )
}

// Mirrors the old `PageResponse<T>`.
export function paged(content, page, size, totalElements) {
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  }
}
