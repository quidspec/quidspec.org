---
title: quid.lua
description: An annotated guide to the quid.lua reference implementation.
---

Just imagine this huge code block was a bunch of smaller ones:

```lua
#! /usr/bin/env lua

local insert, concat, remove = table.insert, table.concat, table.remove
local upper, lower = string.upper, string.lower
local rep, format = string.rep, string.format

local sixtyones = 0xfffffffffffffff

-- 32-bit integer implementations, obviously, truncate this
-- floating-point-only implementations round to even and overshoot
assert(#(format('%x', sixtyones)) == 15,
  "Sub-60-bit integer support is not implemented")

local type = type
local random

if tonumber(_VERSION:match'%d+$') >= 4 then
  random = math.random
else -- compensate for weaker RNG in older versions of Lua
  math.randomseed(tonumber(tostring({}):match('0x%x+$')) + os.time())
  random = function(m, n)
    if n then return math.random(m, n)
    elseif m > 0xffffffff then
      return (math.random(m >> 32) << 32) | math.random(m & 0xffffffff)
    else return math.random(m) end
  end
end

local casecoerce = lower
local crockbet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
local b32values = {}
for i = 1, #crockbet do
  local digit = crockbet:sub(i,i)
  b32values[digit] = i - 1
  b32values[lower(digit)] = i - 1
end

local function base32(n)
  local b = #crockbet
  local t = {}
  for i = 1, 12 do
    local d = (n % b) + 1
    n = n // b
    insert(t, 1, crockbet:sub(d,d))
  end
  return concat(t,"")
end

local function intfromb32(str)
  local int = b32values[str:sub(1,1)]
  for i = 2, #str do
    int = (int << 5) | b32values[str:sub(i,i)]
  end
  return int
end

local function hexspan(n)
  return '('..('%x'):rep(tonumber(n,16))..')'
end

local uuiddef = [[lo:8-mid:4-ver:1hi:3-var:1seq:3-node:c]]

-- Matches
local uuidpat = uuiddef:gsub('%a+:(%x)', hexspan)
local uuidrawpat = uuidpat:gsub('%-','')

local function quidfrom(left, core, right)
  left, right = base32(left), base32(right)
  if type(core) == 'number' then
    core = crockbet:sub(core+1, core+1)
  end
  return casecoerce(concat({
    left:sub(1, 5), left:sub(6, 10),
    left:sub(11, 12)..core..right:sub(1, 2),
    right:sub(3, 7), right:sub(8, 12)}, '-'))
end

local function BQuid()
  return quidfrom(random(0, sixtyones),
    random(8, 11), random(0, sixtyones))
end

local function uuidchunkstoquid(lo, mid, ver, hi, var, seq, node)
  if ver == '4' or ver == '8' or ver == 'b' then
    local varbits = tonumber(var, 16)
    assert(varbits & 8 ~= 0, 'Invalid UUID (bit 64 unset)')
    local quidver = tonumber(ver, 16) << 1 | (varbits & 7)
    return quidfrom(tonumber(lo .. mid .. hi, 16),
      quidver, tonumber(seq .. node, 16))
  elseif ver == '0' then
    if lo == '00000000' and mid == '0000' and hi == '000'
      and var == '0' and seq == '000' and node == '000000000000' then
      return '00000-00000-00000-00000-00000'
    else
      error 'Invalid null UUID'
    end
  elseif ver == 'f' then
    if lo == 'ffffffff' and mid == 'ffff' and hi == 'fff'
      and var == 'f' and seq == 'fff' and node == 'ffffffffffff' then
      return casecoerce'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ'
    else
      error 'Invalid zilch UUID'
    end
  else
    error 'UUID outside of QUID range'
  end
end

local function uuidtoquid(uuid)
  local lo, mid, ver, hi, var, seq, node = uuid:lower():match(uuidpat)
  if not lo then
    lo, mid, ver, hi, var, seq, node = uuid:lower():match(uuidrawpat)
    assert(lo, "Invalid UUID")
  end
  return uuidchunkstoquid(lo, mid, ver, hi, var, seq, node)
end

-- number of milliseconds between 1970-01-01 and 2000-01-01
local epoch2k = 0xDC6ACFAC00

-- get third-millennial-middle milliseconds
local function getm3ms(str)
  local datecmd = 'date +%s%3N'
  -- TODO: support non-GNU date
  -- TODO: (optionally) increase precision ("idempotence guarantee")?
  if str then datecmd = datecmd .. format(' -d %q', str) end
  return (tonumber(assert(assert(
    io.popen(datecmd)):read'a')) - epoch2k) ~ 0x2000000000000
end

local function m3msdate(ms)
  -- TODO: support non-GNU date
  -- TODO: increased precision support
  local datecmd = format('date --rfc-3339=ns -d "@%i.%i"',
    (epoch2k + ms) // 1000, ms % 1000)
  return (assert(assert(io.popen(datecmd)):read'l'))
end

local function msfrom(quid)
  local digits = quid:gsub('%-',''):lower()
  local core
  if #digits > 12 then
    core = digits:sub(13,13)
    digits = digits:sub(1,10)
  else
    core = 't'
    if #digits < 10 then
      digits = digits .. rep('0', 10 - #digits)
    elseif #digits > 10 then
      digits = digits:sub(1,10)
    end
  end

  --local epoch = 0x200DC6ACFAC00 -- 1<<49 + hammertime(2000-01-01)
  local epoch = 1 << 49
  if core == 't' then
    return intfromb32(digits) - epoch
  elseif core == 'r' then
    return epoch - intfromb32(digits)
  else
    return error('QUID "'..quid..'" is not a time-type')
  end
end

local function TQuid(date)
  return quidfrom((getm3ms(date) << 10) | random(1023),
    'T', random(sixtyones))
end
local function RQuid(date)
  return quidfrom(((getm3ms(date) ~ 0x3ffffffffffff) << 10) | random(1023),
    'R', random(sixtyones))
end

local function timetag(str)
  local stamp = base32(getm3ms(str) << 10)
  return casecoerce(stamp:sub(1, 5) .. '-' .. stamp:sub(6, 10))
end

local function VQuidFromHex(hex)
  local prefix, suffix = hex:match(hexspan'f'..'%x*'..hexspan'f')
  assert(prefix, 'hex string not found')
  return quidfrom(tonumber(prefix, 16), 'V', tonumber(suffix, 16))
end

local function SQuidFromHex(hex)
  local prefix, suffix = hex:match(hexspan'f'..'%x*'..hexspan'f')
  assert(prefix, 'hex string not found')
  return quidfrom(tonumber(prefix, 16) ~ sixtyones,
    'S', tonumber(suffix, 16) ~ sixtyones)
end

local function KQuidFromHex(class, hex)
  local prefix, suffix = hex:match(hexspan'f'..'.*'..hexspan'f')
  assert(prefix, 'hex string not found')
  return quidfrom(tonumber(prefix, 16), class, tonumber(suffix, 16))
end

local modes = {
  fromuuid = function (arg)
    print(uuidtoquid(arg))
  end,
  verity = function (arg)
    print(VQuidFromHex(arg))
  end,
  symbolic = function (arg)
    print(SQuidFromHex(arg))
  end,
  custom = function (class, arg)
    print(KQuidFromHex(class, arg))
  end,
  random = function ()
    print(BQuid())
  end,
  -- TODO: G/H/J/K-QUID validation?
  timestamped = function(arg)
    print(TQuid(arg))
  end,
  revtime = function(arg)
    print(RQuid(arg))
  end,
  datefrom = function(arg)
    print(m3msdate(msfrom(arg)))
  end
}

local flags = {
  ['-up'] = function()
    casecoerce = upper
  end
}

if arg then
  for i, opt in pairs(arg) do
    if opt:sub(1,2) == '--' then arg[i] = opt:sub(2) end
    if flags[opt] then
      flags[opt]()
      remove(arg, i)
    end
  end
  if #arg == 0 then
    -- TODO: try reading from stdin before defaulting to random mode
    modes.random()
  elseif #arg == 1 then
    if (arg[1] == '-random' or arg[1] == '-r' or arg[1] == '-89AB') then
      modes.random()
    elseif arg[1] == '-timetag' then
      print(timetag())
    elseif arg[1] == '-timestamped' or arg[1] == '-T' then
      modes.timestamped()
    elseif arg[1] == '-revtime' or arg[1] == '-R' or arg[1] == '-IT' then
      modes.revtime()
    elseif arg[1]:match(uuidpat) or arg[1]:match(uuidrawpat) then
      modes.fromuuid(arg[1])
    else
      error(format('Unrecognized option %q', arg[1]))
    end
  elseif #arg >= 2 then
    if arg[1] == '-uuid' or arg[1] == '-xU' then
      modes.fromuuid(arg[2])
    elseif arg[1] == '-timestamped' or arg[1] == '-T' then
      modes.timestamped(arg[2])
    elseif arg[1] == '-revtime' or arg[1] == '-R' or arg[1] == '-IT' then
      modes.revtime(arg[2])
    elseif arg[1] == '-timetag' then
      print(timetag(arg[2]))
    elseif arg[1] == '-when' then
      modes.datefrom(arg[2])
    elseif arg[1] == '-xS' or arg[1] == '-xIV' then
      modes.symbolic(arg[2])
    elseif arg[1] == '-xV' then
      modes.verity(arg[2])
    else
      local custom = arg[1]:match('%-x([GHJK])')
      if custom then modes.custom(custom, arg[2])
      else error(format('Unrecognized option %q', arg[1]))
      end
    end
  end
end
```