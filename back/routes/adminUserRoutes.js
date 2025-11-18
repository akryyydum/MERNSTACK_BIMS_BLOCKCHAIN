const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminUserCtrl = require("../controllers/adminUserController");

router.use(auth, authorize("admin"));

router.get("/", adminUserCtrl.list);
router.post("/", adminUserCtrl.create);
router.patch("/:id", adminUserCtrl.update);
router.delete("/:id", adminUserCtrl.remove);
router.post("/:id/change-password", adminUserCtrl.changePassword);

module.exports = router;