import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [tasks, setTasks] = useState([])
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newTask, setNewTask] = useState({ title: '', description: '' })

  // VULNERABILITY 1: Token stored in localStorage (XSS can steal it)
  const getToken = () => localStorage.getItem('token')
  const setToken = (token) => localStorage.setItem('token', token)

  // VULNERABILITY 2: No input sanitization for login
  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        setUser(data.user)
        // VULNERABILITY 3: Logging sensitive data to console
        console.log('Login successful:', data.user)
      } else {
        alert('Login failed: ' + data.error)
      }
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  // VULNERABILITY 4: Search query not sanitized (potential XSS)
  const handleSearch = async () => {
    try {
      const response = await fetch(`/api/tasks/search?query=${searchQuery}`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  // VULNERABILITY 5: No CSRF protection
  const handleCreateTask = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...newTask,
          user_id: user?.id
        })
      })

      if (response.ok) {
        setNewTask({ title: '', description: '' })
        // Refresh tasks
        fetchTasks()
      }
    } catch (error) {
      console.error('Create task error:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks/search?query=')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Fetch tasks error:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  if (!user) {
    return (
      <div className="container">
        <div className="login-form">
          <h1>DevSecOps Task Manager</h1>
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
          <div className="hint">
            <p>Default credentials:</p>
            <p>Username: admin | Password: password123</p>
            <p>Username: user1 | Password: password123</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>Task Manager</h1>
        <div className="user-info">
          {/* VULNERABILITY 6: Displaying user role in UI (information disclosure) */}
          <p>Welcome, {user.username} ({user.role})</p>
          <button onClick={() => {
            localStorage.removeItem('token')
            setUser(null)
          }}>Logout</button>
        </div>
      </header>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div className="create-task-section">
        <h2>Create New Task</h2>
        <form onSubmit={handleCreateTask}>
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Task description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          <button type="submit">Create Task</button>
        </form>
      </div>

      <div className="tasks-section">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks found. Create your first task!</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-item">
                {/* VULNERABILITY 7: Potential XSS - rendering unsanitized user input */}
                <h3 dangerouslySetInnerHTML={{ __html: task.title }}></h3>
                <p dangerouslySetInnerHTML={{ __html: task.description }}></p>
                <small>Task ID: {task.id}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
