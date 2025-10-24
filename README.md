# DauphinDash - Personal Progress Dashboard

A beautiful, GitHub contribution graph-style dashboard for tracking your daily progress on weight, LeetCode problems, and workouts.

## Features

- 📊 **Contribution Graph Visualization**: GitHub-style heatmap showing your daily progress
- ⚖️ **Weight Tracking**: Monitor your weight with daily entries and change calculations
- 💻 **LeetCode Progress**: Track problems solved with weekly summaries
- 💪 **Workout Tracking**: Record workout sessions and maintain streaks
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 💾 **Local Storage**: All data stored locally in your browser
- 🎨 **Modern UI**: Beautiful, clean interface with smooth animations

## How to Use

1. **Add Today's Data**: Use the form at the bottom to enter:
   - Your current weight
   - Number of LeetCode problems solved
   - Whether you worked out (checkbox)

2. **View Progress**: The contribution graph shows your activity over the last year:
   - Blue squares: Days you tracked weight
   - Green squares: Days you solved LeetCode problems
   - Orange squares: Days you worked out
   - Multi-colored squares: Days with multiple activities

3. **Track Stats**: The dashboard shows:
   - Current weight and daily change
   - Total LeetCode problems solved
   - Current workout streak
   - Weekly summaries

## Deployment to GitHub Pages

1. **Create a GitHub Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

3. **Access Your Dashboard**:
   - Your dashboard will be available at: `https://yourusername.github.io/your-repo-name`

## Data Storage

- All data is stored locally in your browser using localStorage
- Data persists between sessions
- No external servers or databases required
- Your data stays private on your device

## Customization

You can easily customize the dashboard by modifying:
- **Colors**: Update the CSS variables in `styles.css`
- **Metrics**: Add new tracking categories in `script.js`
- **Layout**: Modify the HTML structure in `index.html`

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use and modify as needed!

---

Built with ❤️ for personal productivity and progress tracking.
