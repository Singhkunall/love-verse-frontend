import React, { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle2, Circle, Calendar, Heart } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io.connect('http://localhost:8000');

function Routine({ user, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const userId = user._id || user.id;
  const partnerId = user.partnerId?._id || user.partnerId;
  const roomId = [userId, partnerId].sort().join("_");

  // 1. Fetch Tasks & Socket Setup
  useEffect(() => {
    fetchTasks();
    socket.emit("join_chat", roomId); // Routine bhi isi room mein sync hogi

    socket.on("task_updated", () => {
      fetchTasks();
    });

    return () => socket.off("task_updated");
  }, [roomId]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/routine/${roomId}`);
      setTasks(res.data);
    } catch (err) { console.error("Error fetching tasks", err); }
  };

  // 2. Add New Task
  const addTask = async () => {
    if (!newTask.trim()) return;
    const taskData = {
      roomId,
      text: newTask,
      completed: false,
      addedBy: user.name
    };
    try {
      await axios.post(`http://localhost:8000/api/routine/add`, taskData);
      socket.emit("update_task", { roomId }); // Partner ko signal bhejo
      setNewTask("");
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  // 3. Toggle Task (Complete/Incomplete)
  const toggleTask = async (taskId, currentStatus) => {
    try {
      await axios.put(`http://localhost:8000/api/routine/toggle/${taskId}`, {
        completed: !currentStatus
      });
      socket.emit("update_task", { roomId });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  // 4. Delete Task
  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`http://localhost:8000/api/routine/delete/${taskId}`);
      socket.emit("update_task", { roomId });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-white/90 backdrop-blur-2xl shadow-2xl border-l border-rose-100 z-[120] flex flex-col animate-in slide-in-from-right duration-300 rounded-l-[3rem]">
      {/* Header */}
      <div className="p-6 border-b border-rose-50 flex items-center justify-between bg-rose-50/30">
        <div className="flex items-center gap-2">
          <Calendar className="text-rose-500" size={20} />
          <h2 className="font-black text-gray-800 tracking-tight">Our Routine</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-rose-500 font-bold text-xl">×</button>
      </div>

      {/* Input Section */}
      <div className="p-4">
        <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-rose-100 p-1">
          <input 
            type="text" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a sweet task..."
            className="w-full bg-transparent p-3 outline-none text-sm text-gray-600"
          />
          <button onClick={addTask} className="bg-rose-500 text-white p-2.5 rounded-xl hover:bg-rose-600 transition-all shadow-md">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-6">
            <Heart size={40} className="text-rose-300 mb-2 animate-pulse" />
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">No plans yet?</p>
            <p className="text-[10px] text-gray-400 mt-1 italic">"Small steps everyday lead to forever..."</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task._id} className={`group flex items-center justify-between p-4 rounded-2xl transition-all border ${
              task.completed ? "bg-rose-50/50 border-transparent" : "bg-white border-rose-50 hover:border-rose-200"
            }`}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleTask(task._id, task.completed)} className="transition-transform active:scale-90">
                  {task.completed ? 
                    <CheckCircle2 className="text-green-500 fill-green-50" size={22} /> : 
                    <Circle className="text-rose-200" size={22} />
                  }
                </button>
                <div>
                  <p className={`text-sm font-semibold transition-all ${
                    task.completed ? "text-gray-400 line-through" : "text-gray-700"
                  }`}>{task.text}</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">By {task.addedBy}</p>
                </div>
              </div>
              <button onClick={() => deleteTask(task._id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Quote */}
      <div className="p-6 text-center border-t border-rose-50">
        <p className="text-[10px] text-rose-300 font-black italic">Building memories, one task at a time.</p>
      </div>
    </div>
  );
}

export default Routine;