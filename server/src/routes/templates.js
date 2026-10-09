import { Router } from "express";
import { listTemplates, saveTemplate, deleteTemplate } from "../services/templateStore.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { sanitizeTemplate } from "../lib/validate.js";

const router = Router();

const nameFrom = (req) => {
  const name = String(req.params.name || "").trim();
  if (!name || name.length > 80) throw new HttpError(400, "Template names need 1 to 80 characters.");
  return name;
};

/** GET /api/templates -> { templates } */
router.get("/templates", asyncHandler(async (req, res) => {
  res.json({ templates: await listTemplates() });
}));

/** PUT /api/templates/:name  <template> -> { templates } */
router.put("/templates/:name", asyncHandler(async (req, res) => {
  const name = nameFrom(req);
  const templates = await saveTemplate({ ...sanitizeTemplate(req.body), name });
  res.json({ templates });
}));

/** DELETE /api/templates/:name -> { templates } */
router.delete("/templates/:name", asyncHandler(async (req, res) => {
  res.json({ templates: await deleteTemplate(nameFrom(req)) });
}));

export default router;
