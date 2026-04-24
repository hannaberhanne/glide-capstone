import { useCallback, useState } from "react";
import { apiClient } from "../lib/apiClient.js";

export default function useSchedule() {
  const [blocks, setBlocks] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchBlocks = useCallback(async (dateKey) => {
    if (!dateKey) return;
    setScheduleLoading(true);
    try {
      const data = await apiClient.get(`/api/schedule/today?date=${dateKey}`);
      setBlocks(data.blocks || []);
    } catch (err) {
      console.error("Failed to fetch schedule blocks:", err);
      setBlocks([]);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const generateSchedule = useCallback(async (dateKey) => {
    setGenerating(true);
    try {
      await apiClient.post("/api/schedule/generate", { date: dateKey });
      await fetchBlocks(dateKey);
    } catch (err) {
      console.error("Failed to generate schedule:", err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [fetchBlocks]);

  const completeBlock = useCallback(async (blockId) => {
    const data = await apiClient.patch(`/api/schedule/blocks/${blockId}/complete`, {});
    setBlocks((prev) =>
      prev.map((b) => (b.blockId === blockId ? { ...b, status: "done" } : b))
    );
    return data;
  }, []);

  return { blocks, scheduleLoading, generating, fetchBlocks, generateSchedule, completeBlock };
}
