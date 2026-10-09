import Branch from '@/models/Branch'
import Employee from '@/models/Employee'

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeAttendanceLocation(body = {}) {
  const raw = body.location && typeof body.location === 'object' ? body.location : body
  const latitude = toNumber(raw.lat ?? raw.latitude)
  const longitude = toNumber(raw.lng ?? raw.longitude)
  const accuracy = toNumber(raw.accuracy)

  if (latitude == null || longitude == null) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

  return { latitude, longitude, accuracy: accuracy != null && accuracy >= 0 ? accuracy : null }
}

export function distanceMeters(from, to) {
  const earthRadius = 6371000
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)
  const deltaLat = toRadians(to.latitude - from.latitude)
  const deltaLng = toRadians(to.longitude - from.longitude)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export async function validateAttendanceLocationPolicy({ tenantId, employeeId = null, location }) {
  // If employee has a specific assigned branch with coordinates, check that branch
  let targetBranch = null
  if (employeeId) {
    try {
      const emp = await Employee.findOne({ _id: employeeId, tenantId, deleted: false })
        .select('branch')
        .populate('branch')
        .lean()
      if (
        emp?.branch &&
        emp.branch.active !== false &&
        !emp.branch.deleted &&
        typeof emp.branch.latitude === 'number' &&
        typeof emp.branch.longitude === 'number'
      ) {
        targetBranch = emp.branch
      }
    } catch (err) {
      console.warn('[attendanceLocationPolicy] Failed to lookup employee branch:', err.message)
    }
  }

  const policyLocations = targetBranch
    ? [targetBranch]
    : await Branch.find({
        tenantId,
        deleted: false,
        active: true,
        latitude: { $type: 'number' },
        longitude: { $type: 'number' },
      })
        .select('name city latitude longitude geoFenceRadius')
        .lean()

  if (!policyLocations.length) {
    return { ok: true, enforced: false, status: 'NOT_CONFIGURED', location: null }
  }

  if (!location) {
    return {
      ok: false,
      enforced: true,
      status: 'MISSING',
      message: 'Attendance location is required. Please allow browser location permission.',
    }
  }

  const evaluated = policyLocations
    .map((branch) => {
      const dist = distanceMeters(location, {
        latitude: branch.latitude,
        longitude: branch.longitude,
      })
      const radius = Number(branch.geoFenceRadius || 100)
      return {
        branch,
        distance: dist,
        radius,
      }
    })
    .sort((a, b) => a.distance - b.distance)

  const nearest = evaluated[0]

  if (!nearest || nearest.distance > nearest.radius) {
    return {
      ok: false,
      enforced: true,
      status: 'OUT_OF_RANGE',
      nearest,
      message: nearest
        ? `You are ${nearest.distance}m away from ${nearest.branch.name}. Attendance is only allowed within ${nearest.radius}m.`
        : 'You are outside the configured attendance location.',
    }
  }

  return {
    ok: true,
    enforced: true,
    status: 'VERIFIED',
    location: {
      branchId: nearest.branch._id,
      branchName: nearest.branch.name,
      distanceMeters: nearest.distance,
      radiusMeters: nearest.radius,
    },
  }
}
