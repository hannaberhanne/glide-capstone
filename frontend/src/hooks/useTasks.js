import { useCallback, useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { apiClient } from "../lib/apiClient.js";

export default function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!auth.currentUser) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.get("/api/tasks");
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        fetchTasks();
      } else {
        setTasks([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchTasks]);

  const addTask = async (payload) => {
    const data = await apiClient.post("/api/tasks", payload);
    setTasks((prev) => [...prev, data]);
    return data;
  };

  const updateTask = async (taskId, payload) => {
    const data = await apiClient.patch(`/api/tasks/${taskId}`, payload);
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...payload } : t))
    );
    return data;
  };

  const deleteTask = async (taskId) => {
    await apiClient.delete(`/api/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  };

  const completeTask = async (taskId) => {
    const data = await apiClient.patch(`/api/tasks/${taskId}/complete`, {});
    if (data.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, completedToday: true } : t
        )
      );
    }
    return data;
  };

  return { tasks, setTasks, loading, fetchTasks, addTask, updateTask, deleteTask, completeTask };
}
