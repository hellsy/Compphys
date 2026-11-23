#
# --- computational many-body physics - SS2020 --- 
# solution of exercise 2 of sheet 3
#
# the quantum spin model has to be defined by:
#  - N: the number of sites
#  - L: the number of links
#  - the links are from site1[i] to site2[i]
#  - x-, y-, and z-links are distinguished by alpha[i]
#
# the three types of models of the exercise can be
# addressed via the switch "model"

using LinearAlgebra

N=3

#model = "Ising"
model = "Heisenberg"
#model = "anisotropic"

if model == "Ising"
  L = 3
  site1 = [1,2,3]
  site2 = [2,3,1]
  alpha = [3,3,3]
end

if model == "Heisenberg"
  L = 9
  site1 = [1,1,1,2,2,2,3,3,3]
  site2 = [2,2,2,3,3,3,1,1,1]
  alpha = [1,2,3,1,2,3,1,2,3]
end

if model == "anisotropic"
  L = 3
  site1 = [1,2,3]
  site2 = [2,3,1]
  alpha = [1,2,3]
end

J = ones(L) 

H = zeros(2^N,2^N)

for i in 0:(2^N-1)
  z = digits(i,base = 2,pad = N)
  for j in 1:L
    p = site1[j]
    q = site2[j]
    i_prime = i + (1-2*z[p])*2^(p-1) + (1-2*z[q])*2^(q-1)
    if alpha[j]==1
      H[i_prime+1,i+1] -= 0.25*J[j]
    end
    if alpha[j]==2
      H[i_prime+1,i+1] += 0.25*J[j]*(2*z[p]-1)*(2*z[q]-1)
    end
    if alpha[j]==3
      H[i+1,i+1] -= 0.25*J[j]*(2*z[p]-1)*(2*z[q]-1)
    end
  end
end

E=4*eigvals(H)

Edeg = Array{Float64,1}(undef,1)
deg = Array{Int64,1}(undef,1)
acc = 1e-10

Edeg[1] = E[1]
deg[1] = 1
count = 1

for i in 2:2^N
  global count
  if (abs(E[i] - Edeg[count]) < acc)
    deg[count] += 1
  else
    count += 1
    push!(Edeg,E[i])
    push!(deg,1)
  end
end

println("number of different eigenvalues: ", count)
println()
println("energies\t degeneracies")

for i in 1:count
  println(Edeg[i],"\t",deg[i])
end
