const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Weighment = require("../models/Weighment");

// =============================================
// HELPER FUNCTIONS
// =============================================

const ALLOWED_STATUSES = ["Open", "Draft", "Closed"];

const ALLOWED_ITEM_TYPES = [
  "",
  "Scrap",
  "Ramming Mass",
  "Sponge Iron",
  "Others",
];

function toNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}



function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const grossBlank =
      item.grossWeight === "" ||
      item.grossWeight === null ||
      item.grossWeight === undefined;

    const tareBlank =
      item.tareWeight === "" ||
      item.tareWeight === null ||
      item.tareWeight === undefined;

    const grossWeight = grossBlank ? null : Number(item.grossWeight);
    const tareWeight = tareBlank ? null : Number(item.tareWeight);

    const netWeight =
      grossBlank || tareBlank
        ? null
        : Number((grossWeight - tareWeight).toFixed(3));

    return {
      ...(item._id && mongoose.isValidObjectId(item._id)
        ? { _id: item._id }
        : {}),

      itemName: item.itemName || "",
      grossWeight,
      tareWeight,
      netWeight,
      transferTareToNext: Boolean(item.transferTareToNext),
    };
  });
}



function validateStatus(status) {
  return !status || ALLOWED_STATUSES.includes(status);
}

function validateItemType(itemName) {
  return (
    itemName === undefined ||
    ALLOWED_ITEM_TYPES.includes(itemName)
  );
}

// =============================================
// 1. SEARCH ALL WEIGHMENTS
// GET /api/weighments
// =============================================

router.get("/", async (req, res) => {
  try {
    const { date, partyName, vehicleNo, status } = req.query;

    const filter = {};

    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    if (partyName?.trim()) {
      const escapedParty = partyName
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.partyName = {
        $regex: escapedParty,
        $options: "i",
      };
    }

    if (vehicleNo?.trim()) {
      const escapedVehicle = vehicleNo
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.vehicleNo = {
        $regex: escapedVehicle,
        $options: "i",
      };
    }

    // All (and legacy Active) return records of every status.
    if (status && !["Active", "All"].includes(status)) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter",
        });
      }

      filter.status = status;
    }

    const records = await Weighment.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Search weighments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search weighments",
      error: error.message,
    });
  }
});

// =============================================
// 2. CREATE WEIGHMENT
// POST /api/weighments
// =============================================

router.post("/", async (req, res) => {
  try {
    const body = req.body;

    if (!body.date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const parsedDate = new Date(body.date);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date",
      });
    }

    if (!validateStatus(body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weighment status",
      });
    }

    if (!validateItemType(body.itemName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    const partyGrossWeight = toNumber(body.partyGrossWeight);
    const partyTareWeight = toNumber(body.partyTareWeight);
    const firstWeight = toNumber(body.firstWeight);
    const secondWeight = toNumber(body.secondWeight);

    const weighment = new Weighment({
      date: parsedDate,

      weighmentNo:
        body.weighmentNo ||
        `WG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

      partyName: body.partyName || "",
      vehicleNo: body.vehicleNo || "",

      partyGrossWeight,
      partyTareWeight,
      partyNetWeight: Number(
        (partyGrossWeight - partyTareWeight).toFixed(3)
      ),

      firstWeight,
      secondWeight,
      netWeight: Number(
        (firstWeight - secondWeight).toFixed(3)
      ),

      itemName: body.itemName || "",
      status: body.status || "Open",

      items: normalizeItems(body.items),
    });

    await weighment.save();

    return res.status(201).json({
      success: true,
      message: "Weighment created successfully",
      data: weighment,
    });
  } catch (error) {
    console.error("Create weighment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create weighment",
      error: error.message,
    });
  }
});

// =============================================
// 3. GET ONE WEIGHMENT BY ID
// GET /api/weighments/:id
// =============================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weighment ID",
      });
    }

    const record = await Weighment.findById(id).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Weighment record not found in the connected database",
      });
    }

    /*
     * FIRST-WEIGHT FIX
     *
     * Older records may have firstWeight = 0 because of
     * the model default. Try the last item gross weight,
     * then partyGrossWeight.
     *
     * SECOND-WEIGHT FIX
     *
     * Try the last item tare weight, then partyTareWeight.
     *
     * These fallbacks affect the response. The database is
     * not changed until an update is saved.
     */

    const lastItem = record.items?.[record.items.length - 1];

    if (Number(record.firstWeight) > 0) {
      // Keep the saved first weight.
    } else if (Number(lastItem?.grossWeight) > 0) {
      record.firstWeight = lastItem.grossWeight;
    } else if (Number(record.partyGrossWeight) > 0) {
      record.firstWeight = record.partyGrossWeight;
    } else {
      record.firstWeight = 0;
    }

    if (Number(record.secondWeight) > 0) {
      // Keep the saved second weight.
    } else if (Number(lastItem?.tareWeight) > 0) {
      record.secondWeight = lastItem.tareWeight;
    } else if (Number(record.partyTareWeight) > 0) {
      record.secondWeight = record.partyTareWeight;
    } else {
      record.secondWeight = 0;
    }

    record.netWeight = Number(
      (
        toNumber(record.firstWeight) -
        toNumber(record.secondWeight)
      ).toFixed(3)
    );

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Get weighment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weighment",
      error: error.message,
    });
  }
});

// =============================================
// 4. UPDATE WEIGHMENT
// PUT /api/weighments/:id
// =============================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weighment ID",
      });
    }

    const record = await Weighment.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Weighment record not found",
      });
    }

    if (!validateStatus(body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid weighment status",
      });
    }

    if (!validateItemType(body.itemName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    if (body.date !== undefined) {
      const parsedDate = new Date(body.date);

      if (
        !body.date ||
        Number.isNaN(parsedDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date",
        });
      }

      record.date = parsedDate;
    }

    if (body.partyName !== undefined) {
      record.partyName = body.partyName;
    }

    if (body.vehicleNo !== undefined) {
      record.vehicleNo = body.vehicleNo;
    }

    if (body.partyGrossWeight !== undefined) {
      record.partyGrossWeight = toNumber(body.partyGrossWeight);
    }

    if (body.partyTareWeight !== undefined) {
      record.partyTareWeight = toNumber(body.partyTareWeight);
    }

    record.partyNetWeight = Number(
      (
        toNumber(record.partyGrossWeight) -
        toNumber(record.partyTareWeight)
      ).toFixed(3)
    );

    // Save capture weights independently from item rows.
    if (body.firstWeight !== undefined) {
      record.firstWeight = toNumber(body.firstWeight);
    }

    if (body.secondWeight !== undefined) {
      record.secondWeight = toNumber(body.secondWeight);
    }

    record.netWeight = Number(
      (
        toNumber(record.firstWeight) -
        toNumber(record.secondWeight)
      ).toFixed(3)
    );

    if (body.itemName !== undefined) {
      record.itemName = body.itemName;
    }

    if (body.status !== undefined) {
      record.status = body.status;
    }

    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) {
        return res.status(400).json({
          success: false,
          message: "Items must be an array",
        });
      }

      record.items = normalizeItems(body.items);
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: "Weighment updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Update weighment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update weighment",
      error: error.message,
    });
  }
});

module.exports = router;