import { useCallback, useState } from "react";
import { apiClient } from "../lib/apiClient.js";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export default function useSchedule() {
  const [blocks, setBlocks] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completingBlockId, setCompletingBlockId] = useState(null);
  const [scheduleError, setScheduleError] = useState("");

  const fetchBlocks = useCallback(async (dateKey) => {
    if (!dateKey) return;
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const data = await apiClient.get(`/api/schedule/today?date=${dateKey}`);
      setBlocks(data.blocks || []);
      return data.blocks || [];
    } catch (err) {
      console.error("Failed to fetch schedule blocks:", err);
      setBlocks([]);
      setScheduleError(err?.message || "Failed to fetch schedule.");
      throw err;
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const generateSchedule = useCallback(async (dateKey) => {
    if (!dateKey) return [];
    setGenerating(true);
    setScheduleError("");
    try {
      await apiClient.post("/api/schedule/generate", { date: dateKey });
      return await fetchBlocks(dateKey);
    } catch (err) {
      console.error("Failed to generate schedule:", err);
      setScheduleError(err?.message || "Failed to generate schedule.");
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [fetchBlocks]);

  const replanSchedule = useCallback(async (dateKey) => {
    if (!dateKey) return [];
    setGenerating(true);
    setScheduleError("");
    try {
      if (dateKey === todayKey()) {
        await apiClient.post("/api/schedule/replan", {});
      } else {
        await apiClient.post("/api/schedule/generate", { date: dateKey });
      }
      return await fetchBlocks(dateKey);
    } catch (err) {
      console.error("Failed to replan schedule:", err);
      setScheduleError(err?.message || "Failed to replan schedule.");
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [fetchBlocks]);

  const completeBlock = useCallback(async (blockId, dateKey) => {
    setCompletingBlockId(blockId);
    setScheduleError("");
    try {
      const data = await apiClient.patch(`/api/schedule/blocks/${blockId}/complete`, {});
      if (dateKey) {
        await fetchBlocks(dateKey);
      } else {
        setBlocks((prev) =>
          prev.map((block) =>
            block.blockId === blockId ? { ...block, status: "completed" } : block
          )
        );
      }
      return data;
    } catch (err) {
      console.error("Failed to complete block:", err);
      setScheduleError(err?.message || "Failed to complete schedule block.");
      throw err;
    } finally {
      setCompletingBlockId(null);
    }
  }, [fetchBlocks]);

  return {
    blocks,
    scheduleLoading,
    generating,
    completingBlockId,
    scheduleError,
    fetchBlocks,
    generateSchedule,
    replanSchedule,
    completeBlock,
  };
}
