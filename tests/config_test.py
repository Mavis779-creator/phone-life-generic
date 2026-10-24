"""Configuration contracts; no files outside this edition are changed."""
import sys,copy,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from template_config import load_config,validate,validate_scenario,inside,merge,safe_tree

class ConfigurationTests(unittest.TestCase):
    def setUp(self):self.c=load_config()
    def reject(self,change):
        change(self.c)
        with self.assertRaises(ValueError):validate(self.c)
    def test_blank_defaults(self):
        self.assertEqual(self.c['preset'],'blank');self.assertEqual(self.c['contacts'],[]);self.assertIsNone(self.c['scenario']);self.assertEqual(self.c['music']['tracks'],[])
    def test_pin_rejects_number(self):self.reject(lambda c:c['app'].update(defaultPin=709))
    def test_pin_rejects_length(self):self.reject(lambda c:c['app'].update(defaultPin='12345'))
    def test_handle_rejects_markup(self):self.reject(lambda c:c.update(accountHandle='a<script>'))
    def test_age_range(self):self.reject(lambda c:c['player'].update(age=-1))
    def test_array_fields(self):self.reject(lambda c:c['player'].update(languages='中文'))
    def test_balance_integer(self):self.reject(lambda c:c['wallet'].update(initialBalance=1.5))
    def test_unknown_app(self):self.reject(lambda c:c['desktopPages'][0].append(['not-an-app','未知','unknown']))
    def test_duplicate_app(self):self.reject(lambda c:c['desktopPages'][0].append(c['desktopPages'][0][0]))
    def test_missing_settings(self):self.reject(lambda c:c.update(desktopPages=[[x for x in p if x[0]!='settings'] for p in c['desktopPages']]))
    def test_paths_cannot_escape(self):
        with self.assertRaises(ValueError):inside('../index.html')
    def test_reserved_keys(self):
        with self.assertRaises(ValueError):safe_tree({'x':[{'__proto__':{}}]})
    def test_merge_replaces_array(self):self.assertEqual(merge({'a':{'b':1,'c':2},'list':[1,2]},{'a':{'b':3},'list':[]}),{'a':{'b':3,'c':2},'list':[]})
    def test_custom_contact_without_manager(self):
        self.c['contacts']=[{'key':'friend','name':'自己的角色','handle':'my.friend','slot':'nonIndustryFriends'}];validate(self.c)
    def test_duplicate_contact(self):
        p={'key':'friend','name':'自己的角色','handle':'friend','slot':'nonIndustryFriends'}
        self.reject(lambda c:c.update(contacts=[p,p.copy()]))
    def test_invalid_slot(self):self.reject(lambda c:c.update(contacts=[{'key':'a','name':'甲','handle':'a','slot':'unknown'}]))
    def test_empty_authored_scenario_allowed(self):validate_scenario({'id':'mine','title':'我的故事','nodes':[]},set(),{'kakao'})
    def scenario(self):return {'id':'mine','title':'自定义','nodes':[{'id':'a','contact':'friend','app':'kakao','lines':[{'role':'npc','text':'自行填写'}]},{'id':'b','contact':'friend','lines':[{'role':'npc','text':'自行填写'}]}]}
    def test_custom_schema(self):validate_scenario(self.scenario(),{'friend'},{'kakao'})
    def test_missing_contact(self):
        with self.assertRaises(ValueError):validate_scenario(self.scenario(),set(),{'kakao'})
    def test_dependency_cycle(self):
        s=self.scenario();s['nodes'][0]['dependsOn']=['b']
        with self.assertRaises(ValueError):validate_scenario(s,{'friend'},{'kakao'})
    def test_unknown_dependency(self):
        s=self.scenario();s['nodes'][0]['dependsOn']=['missing']
        with self.assertRaises(ValueError):validate_scenario(s,{'friend'},{'kakao'})
    def test_required_translation(self):
        s=self.scenario();s['nodes'][0]['lines'][0]['text']='안녕'
        with self.assertRaises(ValueError):validate_scenario(s,{'friend'},{'kakao'})
    def test_choice_contract(self):
        s=self.scenario();s['nodes'][0]['choice']={'options':[['a','自己的回复']]}
        with self.assertRaises(ValueError):validate_scenario(s,{'friend'},{'kakao'})
    def test_app_visibility(self):
        s=self.scenario();s['nodes'][0]['app']='weverse'
        with self.assertRaises(ValueError):validate_scenario(s,{'friend'},{'kakao'})

if __name__=='__main__':unittest.main(verbosity=2)
