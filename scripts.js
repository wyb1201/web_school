// ======= 顶部：Popover 初始化（Bootstrap 5 原生） =======
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
    new bootstrap.Popover(el, { trigger: 'hover focus' });
  });
});

// ======= sideBar 开关 =======
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// ======= AI 问答（保留你的原逻辑；无后端时会 404，这是正常） =======
$(function () {
  $('#sendBtn').on('click', function () {
    const userInput = $('#userInput').val();
    if (!userInput) return alert('请先输入问题');

    $('#chatbox').append(
      `<div class="user-message"><strong>你:</strong> <span>${userInput}</span></div>`
    );
    $('#userInput').val('');
    $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);

    $.ajax({
      url: '/ask',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ question: userInput }),
      success: function (response) {
        $('#chatbox').append(
          `<div class="ai-message"><strong>小智:</strong><br>
             <strong>知识点:</strong>${response.acknowledge}<br>
             <strong>相关网址:</strong><a href="${response.b_url}" target="_blank">${response.b_url}</a><br>
             <strong>回答:</strong>${response.reply}</div>`
        );
        $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight);
      },
      error: function () {
        $('#chatbox').append(
          `<div class="ai-message"><strong>小智:</strong> 出现错误，请重试（如在 GitHub Pages 上预览，此功能需要后端）</div>`
        );
      }
    });
  });
});

// ======= 上传-生成（加入 Bootstrap 5 的 Modal API 与 ckplayer 容错） =======
$(function () {
  let imagePath; // 脑图路径
  const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));

  // 点击上传时
  $('#filePass').on('click', function () {
    const fileInput = document.getElementById('input');
    const file = fileInput.files[0];
    if (!file) return alert('请选择一个文件');

    const formData = new FormData();
    formData.append('file', file);

    // 显示等待画面
    loadingModal.show();

    // 上传到后端
    $.ajax({
      url: '/upload',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        // 生成视频、大纲
        let video_path = data.video_path;
        const video_prompt = data.video_prompt.contents;

        // 兼容反斜杠路径
        video_path = String(video_path).split('\\').slice(1).join('/');

        // 大纲
        let newRows = [];
        try {
          newRows = video_prompt.map(item => {
            const [time] = item.end_time.split(',');
            return `<tr>
                      <td style="font-size: 13px; color: #61666D;">${time}</td>
                      <td style="font-size: 13px;">${item.topic}</td>
                    </tr>`;
          });
        } catch (err) {
          console.error('大纲加载失败:', err);
          alert('大纲加载失败，请稍后再试');
        }
        if (newRows.length > 0) {
          $('#dg tbody').append(newRows.join(''));
          // 展开折叠
          const collapseEl = document.getElementById('panelsStayOpen-collapseOne');
          const collapse = new bootstrap.Collapse(collapseEl, { toggle: false });
          collapse.show();
        }

        // 调整 chatbox 高度
        $('#chatbox').css('height', 'auto');
        $('#chatbox').height($('#chatbox')[0].scrollHeight);

        // 初始化视频（带容错）
        try {
          const prompt = video_prompt.map(item => ({
            words: item.topic,
            time: parseTime(item.end_time)
          }));
          mountPlayer(video_path, prompt);
        } catch (e) {
          console.warn('时间轴节点加载失败，使用无时间轴播放器:', e);
          mountPlayer(video_path, null);
        }

        // 脑图
        try {
          imagePath = String(data.image_path).split('\\').slice(1).join('/');
          $('#generateMindmap').prop('disabled', false);
        } catch (e) {
          console.error('脑图加载失败:', e);
          alert('脑图加载失败，请稍后再试');
        }

        loadingModal.hide();
      },
      error: function () {
        alert('文件上传失败，请重新输入密钥并重试（如在 GitHub Pages 上预览，此功能需要后端）');
        loadingModal.hide();
      }
    });
  });

  // 点击生成脑图按钮
  $('#generateMindmap').on('click', function () {
    $('#generatedImage').attr('src', imagePath);
    const imgModal = new bootstrap.Modal(document.getElementById('image-modal'));
    imgModal.show();
  });

  // 00:00:01,120 → 秒
  function parseTime(endTime) {
    const [hh, mm, ss] = String(endTime).split(':');
    return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseFloat(String(ss).replace(',', '.'));
  }
});

// ======= ckplayer 挂载（容错 + 占位保留） =======
function mountPlayer(video_path, prompt) {
  const box = document.getElementById('playerBox');
  if (!box) return;

  // 清空占位
  box.innerHTML = '';

  try {
    if (window.ckplayer) {
      const videoObject = prompt ? {
        container: '#playerBox',
        video: video_path,
        prompt: prompt
      } : {
        container: '#playerBox',
        video: video_path
      };
      new ckplayer(videoObject);
    } else {
      // 兜底占位
      box.innerHTML = `
        <div class="placeholder d-flex flex-column align-items-center justify-content-center text-muted">
          <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
          <div class="mt-2">未加载到 ckplayer，已保留占位框</div>
        </div>`;
      console.warn('ckplayer 未定义：请确认 ckplayer.js 已正确加载。');
    }
  } catch (e) {
    console.error('ckplayer 初始化失败：', e);
    box.innerHTML = `
      <div class="placeholder d-flex flex-column align-items-center justify-content-center text-muted">
        <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
        <div class="mt-2">播放器初始化失败，已保留占位框</div>
      </div>`;
  }
}

// ======= 保存 API 密钥 =======
$(function () {
  $('#button-addon2').on('click', function () {
    const input = $('#key').val();
    if (!input) return;

    $('#key').val('');
    $.ajax({
      url: '/key',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ apiKey: input }),
      success: function () {
        console.log('密钥已成功保存');
        $('#successToast').toast({ delay: 3000 });
        $('#successToast').fadeIn().toast('show');
      },
      error: function () {
        console.error('保存密钥失败（如在 GitHub Pages 上预览，此功能需要后端）');
      }
    });
  });
});
