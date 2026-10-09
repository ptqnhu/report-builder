import { useEffect, useState } from "react";
import { api } from "../api.js";

/** Saved templates, stored on the server so the whole team can reuse them. */
export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch((e) => setMessage(`Saved templates didn't load. ${e.message}`));
  }, []);

  async function save(tpl) {
    try {
      const r = await api.saveTemplate(tpl);
      setTemplates(r.templates);
      setMessage(`Saved “${tpl.name}”.`);
      return true;
    } catch (e) { setMessage(e.message); return false; }
  }

  async function remove(name) {
    try {
      const r = await api.deleteTemplate(name);
      setTemplates(r.templates);
      setMessage(`Deleted “${name}”.`);
    } catch (e) { setMessage(e.message); }
  }

  return { templates, message, setMessage, save, remove };
}
