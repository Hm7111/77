@@ .. @@
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('user');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // إعادة تعيين النموذج عند تغيير المستخدم
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name);
      setRole(user.role);
-     setBranchId(user.branch_id);
+     setBranchId(user.branch_id || null);
      setPassword('');
      setIsActive(user.is_active !== false);
    } else {
      resetForm();
    }
  }, [user]);
 
  // معالجة تقديم النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const userData = {
      email,
      full_name: fullName,
      role,
     branch_id: branchId || null,
      password,
      is_active: isActive
    };
    
+   console.log('Submitting user data:', userData);
    onSubmit(userData);
  };