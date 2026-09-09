const db = require('../config/database');

/**
 * Valid area boundaries for Ende, NTT
 * Koordinat bounding box untuk wilayah Ende
 */
const ENDE_BOUNDS = {
    minLat: -8.9200,
    maxLat: -8.7500,
    minLng: 121.5800,
    maxLng: 121.7200,
};

/**
 * Valid districts in Ende
 */
const VALID_DISTRICTS = [
    'Ende',
    'Ende Selatan',
    'Ende Tengah',
    'Ende Timur',
    'Ende Utara',
];

/**
 * Valid villages in Ende
 */
const VALID_VILLAGES = [
    'Kelapa Lima', 'Paupanda', 'Onekore', 'Maurole', 'Mbongawani',
    'Rukuramba', 'Tetandara', 'Ndona', 'Wolowaru', 'Kota Raja',
    'Kota Ratu', 'Mbomba', 'Raterua', 'Wee Wella', 'Poto',
];

/**
 * Middleware: Validate location is within Ende, NTT area
 * Mendukung validasi berdasarkan:
 *  - location_id (referensi ke tabel locations)
 *  - district name
 *  - koordinat (latitude, longitude)
 */
const validateLocation = async (req, res, next) => {
    try {
        const { location_id, district, latitude, longitude, address } = req.body;

        let isValid = false;
        let validationDetails = {};

        // Method 1: Validate by location_id
        if (location_id) {
            const locationResult = await db.query(
                `SELECT id, village, district, city, province
                 FROM locations
                 WHERE id = $1 AND city = 'Ende' AND province = 'Nusa Tenggara Timur'`,
                [location_id]
            );

            if (locationResult.rows.length > 0) {
                isValid = true;
                validationDetails = {
                    method: 'location_id',
                    location: locationResult.rows[0],
                };
            }
        }

        // Method 2: Validate by district name
        if (!isValid && district) {
            const normalizedDistrict = district.trim();
            const found = VALID_DISTRICTS.some(
                d => d.toLowerCase() === normalizedDistrict.toLowerCase()
            );

            if (found) {
                isValid = true;
                validationDetails = {
                    method: 'district',
                    district: normalizedDistrict,
                };
            }
        }

        // Method 3: Validate by coordinates (bounding box)
        if (!isValid && latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);

            if (
                lat >= ENDE_BOUNDS.minLat &&
                lat <= ENDE_BOUNDS.maxLat &&
                lng >= ENDE_BOUNDS.minLng &&
                lng <= ENDE_BOUNDS.maxLng
            ) {
                isValid = true;
                validationDetails = {
                    method: 'coordinates',
                    latitude: lat,
                    longitude: lng,
                };
            }
        }

        // Method 4: Validate by address text (fuzzy match)
        if (!isValid && address) {
            const normalizedAddress = address.toLowerCase();
            const containsEnde = normalizedAddress.includes('ende');
            const containsNTT = normalizedAddress.includes('ntt') ||
                                normalizedAddress.includes('nusa tenggara timur');

            // Check if address contains any valid village/district
            const containsValidArea = [...VALID_DISTRICTS, ...VALID_VILLAGES].some(
                area => normalizedAddress.includes(area.toLowerCase())
            );

            if ((containsEnde || containsNTT) && containsValidArea) {
                isValid = true;
                validationDetails = {
                    method: 'address_text',
                    address: address,
                };
            }
        }

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Lokasi tidak valid. Pastikan alamat berada di wilayah Ende, NTT.',
                code: 'INVALID_LOCATION',
                data: {
                    validDistricts: VALID_DISTRICTS,
                    validVillages: VALID_VILLAGES,
                    endeBounds: ENDE_BOUNDS,
                },
            });
        }

        // Attach validated location info to request
        req.validatedLocation = validationDetails;
        next();
    } catch (error) {
        console.error('Error validating location:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while validating location',
        });
    }
};

/**
 * Get all valid locations
 */
const getValidLocations = async (req, res) => {
    try {
        const locations = await db.query(
            `SELECT id, village, district, city, province, postal_code, latitude, longitude
             FROM locations
             WHERE city = 'Ende' AND province = 'Nusa Tenggara Timur'
             ORDER BY district, village`
        );

        return res.json({
            success: true,
            data: locations.rows,
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

module.exports = {
    validateLocation,
    getValidLocations,
    VALID_DISTRICTS,
    VALID_VILLAGES,
    ENDE_BOUNDS,
};
