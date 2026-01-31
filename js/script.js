document.addEventListener('DOMContentLoaded', function() {
    // パフォーマンスパッドのモード切り替え
    const padModeButtons = document.querySelectorAll('.pad-mode-btn');

    padModeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const parent = this.closest('.pad-mode-buttons');
            parent.querySelectorAll('.pad-mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
});
