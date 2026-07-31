'use strict';

const express = require('express');
const axios = require('axios');
const config = require('../config/environment');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query is required',
      });
    }

    const response = await axios.get(
      'https://api.openrouteservice.org/geocode/search',
      {
        headers: {
          Authorization: config.openRouteService.apiKey,
        },
        params: {
          text: query,
          size: 5,
        },
      }
    );

    const suggestions = (response.data.features || []).map((feature) => ({
      label: feature.properties.label,
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
    }));

    res.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error('Geocoding error:', error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch address suggestions',
    });
  }
});

module.exports = router;