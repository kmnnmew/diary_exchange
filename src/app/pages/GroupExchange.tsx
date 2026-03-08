import { useState } from "react";
import { Users, Plus, ArrowLeft, Settings, Lock, Unlock, FileText, Stamp, Heart, Globe, ChevronDown, AlertCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  DiaryDecoratorPanel,
  defaultDecoration,
  getPaperStyle,
  getEmotionInfo,
  type DiaryDecoration,
} from "../components/DiaryDecoratorPanel";

type ViewState = 'list' | 'detail' | 'received' | 'available';
type TabState = 'status' | 'write' | 'members';
type ListTab = 'mine' | 'available';

interface Group {
  id: number;
  name: string;
  members: number;
  max: number;
  isOwner: boolean;
  status: 'completed' | 'writing' | 'waiting';
  comments: number;
  isPrivate: boolean;
  desc: string;
}

const INITIAL_GROUPS: Group[] = [
  { id: 1, name: "독서 모임", members: 6, max: 8, isOwner: true, status: 'completed', comments: 2, isPrivate: true, desc: "함께 책을 읽고 감상을 나눠요" },
  { id: 2, name: "기상 스터디", members: 4, max: 6, isOwner: false, status: 'writing', comments: 0, isPrivate: false, desc: "매일 아침 6시 기상 인증" },
  { id: 3, name: "일상 나누기", members: 3, max: 5, isOwner: false, status: 'waiting', comments: 1, isPrivate: true, desc: "소소한 일상을 기록하는 곳" },
];

export function GroupExchange() {
  const { setGroupDiaryWrittenToday, addArchiveEntry } = useApp();
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const [view, setView] = useState<ViewState>('list');
  const [listTab, setListTab] = useState<ListTab>('mine');
  const [activeTab, setActiveTab] = useState<TabState>('status');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedDiary, setSelectedDiary] = useState<any>(null);
  const [receivedComment, setReceivedComment] = useState("");
  const [receivedCommentSent, setReceivedCommentSent] = useState(false);

  // Create Modal State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMax, setNewGroupMax] = useState(6);
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [inviteMethod, setInviteMethod] = useState<'link' | 'password'>('link'); // 초대 방식
  const [invitePassword, setInvitePassword] = useState(""); // 비밀번호

  // Group Write Decoration - localStorage에서 불러오기
  const [decoration, setDecoration] = useState<DiaryDecoration>(() => {
    const savedPaper = localStorage.getItem('defaultPaper');
    const savedStamp = localStorage.getItem('defaultStamp');
    return {
      ...defaultDecoration,
      paper: (savedPaper as any) || defaultDecoration.paper,
      stamp: savedStamp || defaultDecoration.stamp,
    };
  });
  const [activePanel, setActivePanel] = useState<'paper' | 'stamp' | 'emotion' | null>(null);
  const [writeContent, setWriteContent] = useState("");

  // Member management dropdown
  const [openMemberDropdown, setOpenMemberDropdown] = useState<number | null>(null);

  // Real state — persisted to localStorage
  const [myGroups, setMyGroups] = useState<Group[]>(() => {
    const raw = localStorage.getItem('myGroups');
    if (raw) return JSON.parse(raw);
    localStorage.setItem('myGroups', JSON.stringify(INITIAL_GROUPS));
    return INITIAL_GROUPS;
  });

  const availableGroups = [
    { id: 101, name: "영화 감상", members: 4, max: 8, desc: "매주 영화 한 편 보고 이야기해요", isPrivate: false, tags: ["영화", "주간"] },
    { id: 102, name: "글쓰기 연습", members: 7, max: 10, desc: "매일 500자 글쓰기 도전", isPrivate: false, tags: ["글쓰기", "매일"] },
    { id: 103, name: "자연 관찰", members: 2, max: 6, desc: "계절의 변화를 기록하는 일기 모임", isPrivate: false, tags: ["자연", "계절"] },
    { id: 104, name: "여행 일지", members: 5, max: 8, desc: "여행 경험을 나누는 모임", isPrivate: false, tags: ["여행", "기록"] },
    { id: 105, name: "음악 감상", members: 3, max: 6, desc: "좋아하는 음악과 함께한 하루를 써요", isPrivate: false, tags: ["음악", "감성"] },
  ];

  const groupMembers = [
    { id: 1, name: "나", status: 'completed', isMe: true, isOwner: true },
    { id: 2, name: "책벌레", status: 'completed', isMe: false, isOwner: false },
    { id: 3, name: "새벽형", status: 'waiting', isMe: false, isOwner: false },
    { id: 4, name: "커피러버", status: 'writing', isMe: false, isOwner: false },
  ];

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setView('detail');
    setActiveTab('status');
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }
    const newGroup: Group = {
      id: Date.now(),
      name: newGroupName.trim(),
      members: 1,
      max: newGroupMax,
      isOwner: true,
      status: 'waiting',
      comments: 0,
      isPrivate: newGroupPrivate,
      desc: newGroupDesc.trim() || '새로운 그룹입니다.',
    };
    setMyGroups(prev => {
      const updated = [...prev, newGroup];
      localStorage.setItem('myGroups', JSON.stringify(updated));
      return updated;
    });
    setShowCreateModal(false);
    setNewGroupName("");
    setNewGroupDesc("");
    setNewGroupMax(6);
    setNewGroupPrivate(false);
    toast.success(`"${newGroup.name}" 그룹이 생성되었습니다!`);
  };

  const handleDiaryClick = (diary: any) => {
    setSelectedDiary(diary);
    setView('received');
  };

  const togglePanel = (panel: 'paper' | 'stamp' | 'emotion') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const emotionInfo = getEmotionInfo(decoration.emotion);
  const paperStyle = getPaperStyle(decoration.paper);

  // ========================
  // LIST VIEW
  // ========================
  if (view === 'list') {
    return (
      <div className="max-w-5xl mx-auto p-8 font-serif text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 h-[64px]">
          <h1 className="text-[24pt] font-serif">그룹 일기</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors rounded-[2px]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[11pt] font-mono">그룹 만들기</span>
          </button>
        </div>

        {/* List Tabs */}
        <div className="flex gap-8 mb-8 border-b border-[var(--line)]">
          <button
            onClick={() => setListTab('mine')}
            className={`pb-3 border-b-2 font-serif text-[11pt] transition-colors ${listTab === 'mine' ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            참여 중인 방
          </button>
          <button
            onClick={() => setListTab('available')}
            className={`pb-3 border-b-2 font-serif text-[11pt] transition-colors ${listTab === 'available' ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            참여할 수 있는 방
          </button>
        </div>

        {/* My Groups Grid */}
        {listTab === 'mine' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map(group => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="border border-[var(--line)] p-5 bg-[var(--surface)] hover:border-[var(--accent)] transition-colors cursor-pointer group rounded-[4px]"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-[16pt] font-serif">{group.name}</h3>
                  <span className="text-[9pt] font-mono border border-[var(--line)] px-2 py-0.5 rounded-full text-[var(--text-muted)] flex items-center gap-1 shrink-0 ml-2">
                    {group.isPrivate ? <Lock size={10} /> : <Unlock size={10} />}
                    {group.isPrivate ? "비공개" : "공개"}
                  </span>
                </div>

                <p className="text-[10pt] text-[var(--text-muted)] font-sans mb-4 line-clamp-1">{group.desc}</p>

                <div className="flex items-center gap-2 mb-6">
                  <Users size={12} className="text-[var(--text-muted)]" />
                  <span className="text-[10pt] font-mono text-[var(--text-muted)]">{group.members}/{group.max}명</span>
                  {group.isOwner && <span className="text-[9pt] font-mono text-[var(--accent)] ml-1">방장</span>}
                </div>

                <div className="flex justify-between items-end border-t border-dashed border-[var(--line)] pt-4">
                  <div className={`text-[10pt] font-mono ${group.status === 'completed' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {group.status === 'completed' ? '✓ 작성 완료' : group.status === 'writing' ? '✏ 작성 중' : '○ 미작성'}
                  </div>
                  {group.comments > 0 && (
                    <div className="bg-[var(--accent)] text-white text-[10pt] px-2 py-0.5 rounded-full font-mono">
                      코멘트 {group.comments}건
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Groups */}
        {listTab === 'available' && (
          <div className="space-y-3">
            <p className="text-[10pt] font-mono text-[var(--text-muted)] mb-6">
              공개된 그룹에 참여해 함께 일기를 교환해보세요.
            </p>
            {availableGroups.map(group => (
              <div
                key={group.id}
                className="border border-[var(--line)] p-5 bg-[var(--surface)] hover:border-[var(--accent)] transition-colors rounded-[4px] flex items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-[15pt] font-serif">{group.name}</h3>
                    <Globe size={13} className="text-[var(--text-muted)]" />
                    <div className="flex gap-1.5">
                      {group.tags.map(tag => (
                        <span key={tag} className="text-[8pt] font-mono px-2 py-0.5 rounded-full text-white bg-[var(--secondary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10pt] text-[var(--text-muted)] font-sans mb-3">{group.desc}</p>
                  <div className="flex items-center gap-1 text-[10pt] font-mono text-[var(--text-muted)]">
                    <Users size={12} />
                    <span>{group.members}/{group.max}명 참여 중</span>
                    <span className="ml-3 text-[var(--secondary)]">
                      {group.members >= group.max ? '정원 마감' : `${group.max - group.members}자리 남음`}
                    </span>
                  </div>
                </div>
                <div className="ml-6 shrink-0">
                  {group.members >= group.max ? (
                    <button
                      disabled
                      className="px-5 py-2 rounded-[2px] text-[10pt] font-mono bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed"
                    >
                      마감
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const alreadyIn = myGroups.some(g => g.name === group.name);
                        if (alreadyIn) {
                          toast.info("이미 참여 중인 그룹입니다.");
                          return;
                        }
                        const newGroup: Group = {
                          id: Date.now(),
                          name: group.name,
                          members: group.members + 1,
                          max: group.max,
                          isOwner: false,
                          status: 'waiting',
                          comments: 0,
                          isPrivate: false,
                          desc: group.desc,
                        };
                        setMyGroups(prev => {
                          const updated = [...prev, newGroup];
                          localStorage.setItem('myGroups', JSON.stringify(updated));
                          return updated;
                        });
                        toast.success(`"${group.name}" 그룹에 참여했습니다!`);
                        setListTab('mine');
                      }}
                      className="px-5 py-2 rounded-[2px] text-[10pt] font-mono bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors"
                    >
                      참여하기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--line)] p-8 w-[520px] rounded-[6px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--line)]">
                <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center">
                  <Plus size={16} className="text-white" />
                </div>
                <h3 className="text-[18pt] font-serif text-[var(--text-primary)]">새 그룹 만들기</h3>
              </div>

              <div className="space-y-5 mb-8">
                {/* Group Name */}
                <div className="bg-white/60 border border-[var(--line)] rounded-[4px] p-4">
                  <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-2 uppercase tracking-wider">그룹 이름 *</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="예: 독서 모임, 글쓰기 스터디"
                    className="w-full bg-transparent outline-none font-serif text-[14pt] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:italic"
                  />
                </div>

                {/* Description */}
                <div className="bg-white/60 border border-[var(--line)] rounded-[4px] p-4">
                  <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-2 uppercase tracking-wider">그룹 소개</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="어떤 그룹인지 간략히 소개해주세요."
                    className="w-full bg-transparent outline-none font-serif text-[12pt] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:italic resize-none h-16"
                  />
                </div>

                {/* Max Members */}
                <div className="bg-white/60 border border-[var(--line)] rounded-[4px] p-4 flex items-center justify-between">
                  <div>
                    <label className="block text-[9pt] font-mono text-[var(--text-muted)] uppercase tracking-wider">최대 인원</label>
                    <p className="text-[9pt] text-[var(--text-muted)] font-sans mt-0.5">2명 ~ 20명</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setNewGroupMax(Math.max(2, newGroupMax - 1))}
                      className="w-8 h-8 border border-[var(--line)] flex items-center justify-center hover:bg-[var(--line)] rounded-[2px] font-mono"
                    >-</button>
                    <span className="font-mono text-[16pt] w-8 text-center text-[var(--text-primary)]">{newGroupMax}</span>
                    <button
                      onClick={() => setNewGroupMax(Math.min(20, newGroupMax + 1))}
                      className="w-8 h-8 border border-[var(--line)] flex items-center justify-center hover:bg-[var(--line)] rounded-[2px] font-mono"
                    >+</button>
                  </div>
                </div>

                {/* Privacy */}
                <div className="bg-white/60 border border-[var(--line)] rounded-[4px] p-4">
                  <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-3 uppercase tracking-wider">공개 여부</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewGroupPrivate(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] text-[10pt] font-mono transition-colors border ${!newGroupPrivate ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text-muted)] border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                    >
                      <Unlock size={13} />
                      공개
                    </button>
                    <button
                      onClick={() => setNewGroupPrivate(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[4px] text-[10pt] font-mono transition-colors border ${newGroupPrivate ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text-muted)] border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                    >
                      <Lock size={13} />
                      비공개
                    </button>
                  </div>
                  <p className="text-[8pt] text-[var(--text-muted)] font-sans mt-2">
                    {newGroupPrivate ? "초대 링크로만 참여 가능합니다." : "누구나 참여할 수 있습니다."}
                  </p>

                  {/* 비공개 초대 설정 */}
                  {newGroupPrivate && (
                    <div className="mt-4 pt-4 border-t border-[var(--line)]">
                      <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-3">초대 방식</label>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setInviteMethod('link')}
                          className={`flex-1 py-2 rounded-[4px] text-[9pt] font-mono transition-colors border ${inviteMethod === 'link' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text-muted)] border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                        >
                          링크로 초대
                        </button>
                        <button
                          onClick={() => setInviteMethod('password')}
                          className={`flex-1 py-2 rounded-[4px] text-[9pt] font-mono transition-colors border ${inviteMethod === 'password' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text-muted)] border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                        >
                          비밀번호로 초대
                        </button>
                      </div>
                      {inviteMethod === 'password' && (
                        <input
                          type="password"
                          value={invitePassword}
                          onChange={(e) => setInvitePassword(e.target.value)}
                          placeholder="그룹 비밀번호 입력"
                          className="w-full bg-white/60 border border-[var(--line)] rounded-[4px] p-3 outline-none font-mono text-[11pt] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:italic"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 bg-[var(--accent)] text-white py-3 rounded-[2px] hover:bg-[var(--accent)]/90 transition-colors font-mono text-[11pt]"
                >
                  그룹 만들기
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors rounded-[2px] font-mono text-[11pt]"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================
  // DETAIL VIEW
  // ========================
  if (view === 'detail') {
    return (
      <div className="max-w-5xl mx-auto p-8 pb-20 font-serif text-[var(--text-primary)]">
        {/* Detail Header */}
        <div className="flex items-center justify-between mb-8 h-[64px]">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="hover:text-[var(--accent)] transition-colors">
              <ArrowLeft className="w-6 h-6 stroke-[1.5]" />
            </button>
            <h1 className="text-[20pt] font-serif">{selectedGroup?.name}</h1>
          </div>
          {selectedGroup?.isOwner && (
            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <Settings className="w-6 h-6 stroke-[1.5]" />
            </button>
          )}
        </div>

        {/* Detail Tabs */}
        <div className="flex gap-8 mb-8 border-b border-[var(--line)]">
          {(['status', 'write', 'members'] as TabState[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setActivePanel(null); }}
              className={`pb-3 border-b-2 font-serif text-[11pt] transition-colors ${activeTab === tab ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
            >
              {tab === 'status' ? '교환 현황' : tab === 'write' ? '일기 작성' : '멤버'}
            </button>
          ))}
        </div>

        {activeTab === 'status' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* My Status Card */}
            <div className="bg-[var(--surface)] border-l-4 border-[var(--secondary)] shadow-sm p-6 mb-8 flex items-center justify-between">
              <div>
                <div className="text-[10pt] font-mono text-[var(--text-muted)] mb-2">오늘의 일기</div>
                <div className="text-[16pt] font-serif text-[var(--secondary)]">작성 완료</div>
              </div>
              <div className="text-[var(--text-muted)] font-mono text-[10pt]">전달 완료</div>
            </div>

            {/* Member List */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[var(--line)] pb-2">
                <h3 className="text-[14pt] font-serif">오늘의 교환 현황</h3>
                <span className="text-[10pt] font-mono text-[var(--text-muted)]">{today}</span>
              </div>

              <div className="space-y-0">
                {groupMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-4 border-b border-dashed border-[var(--line)]">
                    <div className={`text-[14pt] font-serif w-32 ${member.isMe ? 'text-[var(--accent)]' : ''}`}>
                      {member.name} {member.isMe && "(나)"}
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${['writing', 'waiting', 'completed'].includes(member.status) ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`} />
                      <div className={`w-12 h-px ${['waiting', 'completed'].includes(member.status) ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`} />
                      <div className={`w-3 h-3 rounded-full ${['waiting', 'completed'].includes(member.status) ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`} />
                      <div className={`w-12 h-px ${member.status === 'completed' ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`} />
                      <div className={`w-3 h-3 rounded-full ${member.status === 'completed' ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`} />
                    </div>

                    <div className="w-24 text-right">
                      <span className={`px-2 py-1 rounded-[4px] text-[9pt] font-mono ${
                        member.status === 'completed' ? 'bg-[var(--secondary)] text-white' :
                        member.status === 'waiting' ? 'border border-[var(--line)] text-[var(--text-muted)]' :
                        'text-[var(--accent)] border border-[var(--accent)]'
                      }`}>
                        {member.status === 'completed' ? '완료' : member.status === 'waiting' ? '대기 중' : '작성 중'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past History */}
            <div className="mt-12">
              <h3 className="text-[14pt] font-serif mb-4 border-b border-[var(--line)] pb-2">이전 교환 기록</h3>
              <div className="space-y-2">
                <div
                  onClick={() => handleDiaryClick({ id: 1, date: '2026. 03. 01' })}
                  className="p-4 hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)] cursor-pointer flex justify-between items-center transition-colors"
                >
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">2026. 03. 01</span>
                  <span className="font-serif text-[12pt] text-[var(--text-muted)]">작성된 일기가 있습니다.</span>
                  <span className="text-[var(--secondary)] text-[10pt] font-mono">완료</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'write' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Editor with decoration */}
            <div className="relative min-h-[500px] border border-[var(--line)] shadow-sm" style={paperStyle}>
              {(decoration.paper === 'lined' || decoration.paper === 'vintage') && (
                <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30" />
              )}
              {decoration.stamp && (
                <div className="absolute top-6 right-8 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
                  {decoration.stamp}
                </div>
              )}

              <div className="relative z-10 p-12">
                {emotionInfo && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[18px]">{emotionInfo.emoji}</span>
                    <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: emotionInfo.color }}>
                      {emotionInfo.id}
                    </span>
                  </div>
                )}
                <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-8">{today}</div>
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder="그룹 멤버들에게 오늘 하루를 공유해보세요..."
                  className="w-full h-[350px] bg-transparent outline-none resize-none font-serif text-[15pt] leading-[2.0]"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="fixed bottom-0 left-[64px] right-0 bg-[var(--bg)] border-t border-[var(--line)] z-40">
              <div className="relative">
                <DiaryDecoratorPanel
                  activePanel={activePanel}
                  decoration={decoration}
                  onChange={setDecoration}
                  onClose={() => setActivePanel(null)}
                />
                <div className="h-14 flex items-center justify-between px-8">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePanel('paper')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'paper' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-[10pt]">종이</span>
                    </button>
                    <button
                      onClick={() => togglePanel('stamp')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'stamp' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                    >
                      <Stamp className="w-4 h-4" />
                      <span className="text-[10pt]">스탬프</span>
                      {decoration.stamp && <span className="text-[12px]">{decoration.stamp}</span>}
                    </button>
                    <button
                      onClick={() => togglePanel('emotion')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'emotion' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-[10pt]">감정</span>
                      {emotionInfo && <span className="text-[12px]">{emotionInfo.emoji}</span>}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (/(.)\1{4,}/.test(writeContent)) {
                        toast.error("의미 없는 반복 문자는 전송할 수 없습니다. 내용을 조금 더 작성해주세요.");
                        return;
                      }
                      addArchiveEntry({
                        date: new Date().toISOString().split('T')[0],
                        content: writeContent,
                        type: 'group',
                        emotion: decoration.emotion || undefined,
                        stamp: decoration.stamp || undefined,
                        status: 'waiting',
                        groupName: selectedGroup?.name,
                      });
                      setMyGroups(prev => {
                        const updated = prev.map(g =>
                          g.id === selectedGroup?.id ? { ...g, status: 'completed' as const } : g
                        );
                        localStorage.setItem('myGroups', JSON.stringify(updated));
                        return updated;
                      });
                      toast.success("그룹에 일기를 전송했습니다.");
                      setWriteContent("");
                      setGroupDiaryWrittenToday(true);
                      setActiveTab('status');
                    }}
                    disabled={writeContent.length === 0}
                    className="bg-[var(--accent)] text-white px-8 py-2 rounded-[2px] text-[10pt] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
                  >
                    그룹에 전송하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {groupMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between py-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--line)] flex items-center justify-center font-serif text-[12pt] text-[var(--text-muted)]">
                    {member.name[0]}
                  </div>
                  <span className="text-[14pt] font-serif">{member.name}</span>
                  {member.isOwner && <span className="text-[9pt] font-mono text-[var(--accent)] border border-[var(--accent)]/30 px-2 py-0.5 rounded-full">방장</span>}
                  {member.isMe && <span className="text-[9pt] font-mono text-[var(--text-muted)]">나</span>}
                </div>
                {!member.isMe && (
                  <div className="flex items-center gap-4">
                    {/* 방장 전용 관리 드롭다운 */}
                    {selectedGroup?.isOwner && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMemberDropdown(openMemberDropdown === member.id ? null : member.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10pt] font-mono border border-[var(--line)] hover:border-[var(--text-primary)] transition-colors rounded-[2px]"
                        >
                          관리
                          <ChevronDown size={12} />
                        </button>
                        {openMemberDropdown === member.id && (
                          <div className="absolute top-full right-0 mt-1 bg-[var(--surface)] border border-[var(--line)] shadow-lg rounded-[2px] z-10 min-w-[140px]">
                            <button
                              onClick={() => { toast.info(`${member.name}에게 경고를 보냈습니다.`); setOpenMemberDropdown(null); }}
                              className="w-full px-4 py-2 text-left text-[10pt] font-mono text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
                            >
                              경고 보내기
                            </button>
                            <button
                              onClick={() => { toast.info(`${member.name}의 작성이 제한되었습니다.`); setOpenMemberDropdown(null); }}
                              className="w-full px-4 py-2 text-left text-[10pt] font-mono text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
                            >
                              작성 제한 (오늘 하루)
                            </button>
                            <button
                              onClick={() => { toast.success(`${member.name}를 강제 퇴장시켰습니다.`); setOpenMemberDropdown(null); }}
                              className="w-full px-4 py-2 text-left text-[10pt] font-mono text-[var(--destructive)] hover:bg-[var(--bg)] transition-colors border-t border-[var(--line)]"
                            >
                              강제 퇴장
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <button className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">차단</button>
                    <button className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors">신고</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ========================
  // RECEIVED VIEW
  // ========================
  if (view === 'received') {
    const receivedEmotionInfo = selectedDiary?.emotion ? getEmotionInfo(selectedDiary.emotion) : null;
    return (
      <div className="max-w-5xl mx-auto p-8 font-serif text-[var(--text-primary)] min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 h-[64px] border-b border-[var(--line)] shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('detail')} className="hover:text-[var(--accent)] transition-colors">
              <ArrowLeft className="w-6 h-6 stroke-[1.5]" />
            </button>
            <span className="font-mono text-[11pt] text-[var(--text-muted)]">{selectedGroup?.name}의 멤버로부터</span>
          </div>
          <span className="font-mono text-[10pt] text-[var(--text-muted)]">{selectedDiary?.date || '2026. 03. 01'}</span>
        </div>

        {/* Viewer */}
        <div
          className="flex-[3] relative border border-[var(--line)] p-12 mb-4 overflow-hidden shadow-sm"
          style={getPaperStyle((selectedDiary?.paper_design || selectedDiary?.paper || 'lined') as any)}
        >
          {/* 마진 라인 (줄지/빈티지) */}
          {(selectedDiary?.paper_design === 'lined' || selectedDiary?.paper_design === 'vintage' || !selectedDiary?.paper_design) && (
            <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30 pointer-events-none" />
          )}
          {/* 스탬프 */}
          {selectedDiary?.stamp && (
            <div className="absolute top-6 right-8 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
              {selectedDiary.stamp}
            </div>
          )}
          <div className="relative z-10 flex justify-between items-start mb-4">
            {receivedEmotionInfo ? (
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{receivedEmotionInfo.emoji}</span>
                <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: receivedEmotionInfo.color }}>
                  {receivedEmotionInfo.id}
                </span>
              </div>
            ) : <span />}
            <button
              onClick={() => {
                toast.info("신고가 접수되었습니다. 방장에게 전달됩니다.");
              }}
              className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--destructive)] flex items-center gap-1 transition-colors"
            >
              <Flag size={14} /> 신고
            </button>
          </div>
          <div className="relative z-10">
            <p className="font-serif text-[15pt] leading-[2.0]">
              어제는 정말 바쁜 하루였다. 그룹 스터디 준비를 하느라 밤을 새웠다.
              그래도 멤버들이 다들 열심히 해줘서 보람찼다.
              다음 주에는 좀 더 여유가 생겼으면 좋겠다.
            </p>
          </div>
        </div>

        {/* Comment */}
        <div className="flex-[2] bg-[var(--surface)] border border-[var(--line)] p-6">
          {receivedCommentSent ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <p className="text-[18pt] italic font-serif mb-2 text-[var(--text-primary)]">답장을 보냈어요.</p>
              <p className="text-[13pt] text-[var(--text-muted)] font-serif">원작성자에게 전달됩니다.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[16pt] font-serif">답장을 남겨보세요</h3>
                <span className={`font-mono text-[10pt] ${receivedComment.length >= 30 ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                  {receivedComment.length} / 최소 30자
                </span>
              </div>
              <textarea
                value={receivedComment}
                onChange={(e) => setReceivedComment(e.target.value)}
                placeholder="따뜻한 코멘트를 남겨주세요. (최소 30자)"
                className="w-full h-[120px] bg-transparent outline-none resize-none font-serif text-[14pt] leading-relaxed border border-[var(--line)] p-4 mb-2"
              />
              {receivedComment.length > 0 && receivedComment.length < 30 && (
                <div className="text-[var(--destructive)] text-[10pt] font-mono mb-2 flex items-center gap-1">
                  <AlertCircle size={12} /> 최소 30자 이상 작성해주세요.
                </div>
              )}
              <button
                onClick={() => {
                  if (receivedComment.length < 30) return;
                  if (/(.)\1{4,}/.test(receivedComment)) {
                    toast.error("의미 없는 반복 문자는 전송할 수 없습니다. 내용을 조금 더 작성해주세요.");
                    return;
                  }
                  setReceivedCommentSent(true);
                  toast.success("답장을 보냈어요.");
                }}
                disabled={receivedComment.length < 30}
                className={`w-full py-3 rounded-[2px] transition-colors ${receivedComment.length >= 30 ? 'bg-[var(--secondary)] text-white hover:bg-[var(--secondary)]/90' : 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'}`}
              >
                답장 전송하기
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}