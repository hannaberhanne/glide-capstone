import { useEffect, useState } from "react";
import { auth } from "../config/firebase";

export default function useTasks(API_URL) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!auth.currentUser) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [API_URL]);

  const addTask = async (payload) => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setTasks((prev) => [...prev, data]);
    return data;
  };

  const updateTask = async (taskId, payload) => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, ...payload } : t))
    );
    return data;
  };

  const deleteTask = async (taskId) => {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  };

  const completeTask = async (taskId) => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.taskId === taskId ? { ...t, isComplete: true } : t
        )
      );
    }
    return data;
  };

  return {
    tasks,
    setTasks,
    loading,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
  };
}
